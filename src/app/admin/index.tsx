import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { deleteAnime, updateAnimeFeatured } from '@/lib/admin-operations';
import { dockerDb } from '@/lib/docker-db';
import {
  approveManualPayment,
  getPendingManualPayments,
  rejectManualPayment,
} from '@/lib/rasedi-payment';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Film,
  Lock,
  Pencil,
  Plus,
  Star,
  Trash2,
  XCircle
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Anime = {
  id: string;
  title: string;
  episodes: number;
  genre: string | null;
  category?: string | null;
  is_featured: boolean;
};

export default function AdminPanelScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { maxContentWidth } = useResponsive();

  const ownerEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'esra99san@gmail.com').toLowerCase();
  const isOwner = user?.email?.toLowerCase() === ownerEmail;

  const [activeTab, setActiveTab] = useState<'media' | 'payments'>('media');
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [vipCount, setVipCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [instantEmail, setInstantEmail] = useState('');
  const [instantDays, setInstantDays] = useState(90);
  const [grantingVip, setGrantingVip] = useState(false);

  const handleInstantGrantVip = async () => {
    if (!instantEmail.trim()) {
      const msg = 'Please enter a user email address.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
      else Alert.alert('Required', msg);
      return;
    }
    setGrantingVip(true);
    const email = instantEmail.trim().toLowerCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + instantDays);
    const isoExpiry = expiryDate.toISOString();

    try {
      try {
        await dockerDb.from('profiles').update({
          is_vip: true,
          vip_expires_at: isoExpiry,
        }).ilike('email', email);
      } catch (_e) {}

      await supabase.from('profiles').update({
        is_vip: true,
        vip_expires_at: isoExpiry,
      }).ilike('email', email);

      const successMsg = `VIP activated for ${email} (${instantDays} days)! 🎉`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(successMsg);
      else Alert.alert('VIP Activated', successMsg);

      setInstantEmail('');
      fetchAnime();
    } catch (err: any) {
      const errMs = err.message || 'Failed to grant VIP.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(errMs);
      else Alert.alert('Error', errMs);
    } finally {
      setGrantingVip(false);
    }
  };

  const fetchAnime = async () => {
    try {
      const isWeb = Platform.OS === 'web';
      
      const promises: any[] = [
        supabase
          .from('anime')
          .select('id, title, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false }),
      ];

      if (!isWeb) {
        promises.push(
          dockerDb.from('profiles').select('*', { count: 'exact', head: true }).eq('is_vip', true),
          dockerDb.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          getPendingManualPayments()
        );
      } else {
        promises.push(
          Promise.resolve({ count: 0 }),
          Promise.resolve({ count: 0 }),
          Promise.resolve([])
        );
      }

      promises.push(
        import('@/lib/admin-operations').then(m => m.getEditedMediaOverrides()),
        import('@/lib/admin-operations').then(m => m.getDeletedMediaIds())
      );

      const [
        { data, error }, 
        { count: vips }, 
        { count: payments }, 
        pending, 
        overrides, 
        deletedIds
      ] = await Promise.all(promises);

      let combined: Anime[] = [];
      const safeData = (!error && data) ? data : [];
      
      const deletedStrings = deletedIds.map(String);

      // Merge Cloud Supabase data with Local Overrides
      const cloudItems = safeData
        .filter((item: any) => !deletedStrings.includes(String(item.id)))
        .map((item: any) => ({ ...item, ...(overrides[String(item.id)] || {}) }));
        
      // Add any newly added items that only exist in local overrides
      const newLocalItems = Object.values(overrides)
        .filter((override: any) => !deletedStrings.includes(String(override.id)) && !safeData.some((d: any) => String(d.id) === String(override.id))) as Anime[];

      combined = [...newLocalItems, ...cloudItems];

      setAnimeList(combined);
      if (typeof vips === 'number') setVipCount(vips);
      if (typeof payments === 'number') setPaymentsCount(payments);
      setPendingPayments(pending || []);
    } catch (_e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprovePayment = async (item: any) => {
    setActionLoadingId(item.id);
    const res = await approveManualPayment(item.id);
    setActionLoadingId(null);

    if (res.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`VIP Approved successfully for ${item.metadata?.user_email || 'User'}!`);
      } else {
        Alert.alert('Success', `VIP Approved successfully!`);
      }
      fetchAnime();
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(res.error || 'Failed to approve payment.');
      } else {
        Alert.alert('Error', res.error || 'Failed to approve payment.');
      }
    }
  };

  const handleRejectPayment = async (item: any) => {
    setActionLoadingId(item.id);
    const res = await rejectManualPayment(item.id);
    setActionLoadingId(null);

    if (res.success) {
      fetchAnime();
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(res.error || 'Failed to reject payment.');
      } else {
        Alert.alert('Error', res.error || 'Failed to reject payment.');
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isOwner) return;
      fetchAnime();
    }, [authLoading, isOwner])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnime();
  };

  const handleDelete = async (item: Anime) => {
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete "${item.title}" from AniFlix? This cannot be undone.`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete Media',
          `Are you sure you want to permanently delete "${item.title}" from AniFlix? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    const result = await deleteAnime(item.id);
    if (!result.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(result.error || 'Failed to delete anime');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete anime');
      }
    } else {
      // Re-fetch from database to confirm deletion persisted
      await fetchAnime();
    }
  };

  const handleClearAll = async () => {
    if (animeList.length === 0) return;
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete all ${animeList.length} media items? This cannot be undone.`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete All Media',
          `Are you sure you want to permanently delete all ${animeList.length} media items? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete All', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    // Try the secure RPC first (bypasses RLS, admin-only)
    const { error: rpcErr } = await supabase.rpc('admin_delete_all_anime');
    if (!rpcErr) {
      setAnimeList([]);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`All ${animeList.length} test media items have been deleted! 🎉`);
      } else {
        Alert.alert('Done', 'All media items deleted successfully.');
      }
      await fetchAnime();
      return;
    }

    // Fallback: delete one by one
    for (const item of animeList) {
      await deleteAnime(item.id);
    }
    setAnimeList([]);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('All test media items have been deleted! 🎉');
    } else {
      Alert.alert('Deleted', 'All test media items have been deleted.');
    }
  };

  const handleToggleFeatured = async (item: Anime) => {
    const result = await updateAnimeFeatured(item.id, !item.is_featured);
    if (result.success) {
      setAnimeList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_featured: !a.is_featured } : a)),
      );
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(result.error || 'Failed to update anime');
      } else {
        Alert.alert('Error', result.error || 'Failed to update anime');
      }
    }
  };

  const renderItem = ({ item }: { item: Anime }) => (
    <View style={[styles.card, { backgroundColor: themeColors.backgroundElement }]}>
      <View style={styles.cardInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {item.category && (
            <View style={{ backgroundColor: themeColors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.category.toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.cardTitle, { color: themeColors.text, flex: 1 }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]}>
          {item.genre ?? 'No genre'} · {item.episodes > 1 ? `${item.episodes} eps` : 'Movie'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          onPress={() => router.push({ pathname: '/admin/edit-anime', params: { id: item.id } })}
          style={[styles.iconBtn, { backgroundColor: '#1E293B' }]}
        >
          <Pencil color="#38BDF8" size={16} />
        </Pressable>
        <Pressable
          onPress={() => handleToggleFeatured(item)}
          style={[
            styles.iconBtn,
            { backgroundColor: item.is_featured ? themeColors.primary : themeColors.backgroundSelected },
          ]}
        >
          <Star color={item.is_featured ? '#fff' : themeColors.textSecondary} size={16} fill={item.is_featured ? '#fff' : 'none'} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          style={[styles.iconBtn, { backgroundColor: '#3a0000' }]}
        >
          <Trash2 color="#ff4444" size={16} />
        </Pressable>
      </View>
    </View>
  );

  if (authLoading || (isOwner && loading)) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // Strict Admin Gate: Only admin@aniflix.com or role=admin
  if (!isOwner) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: 600, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E1012', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Lock color="#FF4D4D" size={38} />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Access Restricted
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Only the administrator account (<Text style={{ color: '#38BDF8', fontWeight: '700' }}>esra99san@gmail.com</Text>) has permission to manage, edit, and delete titles on AniFlix.
          </Text>
          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 }}
            onPress={() => router.push({ pathname: '/(auth)/login', params: { redirect: '/adminpanel' } } as any)}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Log In as Administrator</Text>
          </Pressable>
          <Pressable
            style={{ marginTop: 16 }}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Return to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: Math.min(maxContentWidth, 900) }]}>
        {/* Custom Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={[styles.backBtn, { backgroundColor: themeColors.backgroundElement }]}>
            <ArrowLeft color={themeColors.text} size={22} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>AniFlix Admin Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: themeColors.text }]} numberOfLines={1} adjustsFontSizeToFit>{animeList.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>Total Media</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: themeColors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
              {animeList.filter((a) => a.is_featured).length}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>Featured</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: '#FFB800' }]} numberOfLines={1} adjustsFontSizeToFit>{vipCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>VIP Active</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: pendingPayments.length > 0 ? '#EC4899' : '#00E676' }]} numberOfLines={1} adjustsFontSizeToFit>
              {pendingPayments.length > 0 ? `${pendingPayments.length} Pending` : paymentsCount}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              {pendingPayments.length > 0 ? 'Approvals' : 'Payments'}
            </Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.adminTabRow}>
          <Pressable
            style={[styles.adminTab, activeTab === 'media' && styles.adminTabActive]}
            onPress={() => setActiveTab('media')}
          >
            <Film size={16} color={activeTab === 'media' ? '#FFF' : '#8E8EA4'} />
            <Text style={[styles.adminTabText, activeTab === 'media' && styles.adminTabTextActive]}>
              Media Catalog ({animeList.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.adminTab, activeTab === 'payments' && styles.adminTabActive]}
            onPress={() => setActiveTab('payments')}
          >
            <Crown size={16} color={activeTab === 'payments' ? '#FFB800' : '#8E8EA4'} />
            <Text style={[styles.adminTabText, activeTab === 'payments' && styles.adminTabTextActive]}>
              VIP Approvals {pendingPayments.length > 0 ? `(${pendingPayments.length})` : ''}
            </Text>
            {pendingPayments.length > 0 && <View style={styles.pendingBadgeDot} />}
          </Pressable>
        </View>

        {activeTab === 'media' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: themeColors.textSecondary, marginHorizontal: 0, marginBottom: 0 }]}>
                TAP ✏️ TO EDIT · TAP ⭐ TO FEATURE · TAP 🗑 TO DELETE
              </Text>
              {animeList.length > 0 && (
                <Pressable onPress={handleClearAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Trash2 color="#ff4444" size={13} />
                  <Text style={{ color: '#ff4444', fontSize: 11, fontWeight: '700' }}>CLEAR ALL</Text>
                </Pressable>
              )}
            </View>

            <FlatList
              data={animeList}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={themeColors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                    No titles in catalog. Tap + to add your first title!
                  </Text>
                </View>
              }
            />

            <Pressable
              style={[styles.fab, { backgroundColor: themeColors.primary }]}
              onPress={() => router.push('/admin/add-anime' as any)}
            >
              <Plus color="#fff" size={28} />
            </Pressable>
          </>
        ) : (
          <FlatList
            data={pendingPayments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={themeColors.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.instantVipCard}>
                <View style={styles.instantVipHeader}>
                  <Crown size={20} color="#FFB800" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instantVipTitle}>Instant VIP Activation Tool</Text>
                    <Text style={styles.instantVipSub}>
                      Official Contact Number: <Text style={{ color: '#25D366', fontWeight: '800' }}>07824076461</Text> (WhatsApp / Support)
                    </Text>
                  </View>
                </View>

                <Text style={styles.instantVipInputLabel}>User Account Email:</Text>
                <TextInput
                  style={styles.instantVipInput}
                  placeholder="e.g. user@gmail.com"
                  placeholderTextColor="#666680"
                  value={instantEmail}
                  onChangeText={setInstantEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={[styles.instantVipInputLabel, { marginTop: 10 }]}>Select Plan Duration:</Text>
                <View style={styles.daysChipRow}>
                  {[
                    { label: '1 Month (30d)', days: 30 },
                    { label: '3 Months (90d)', days: 90 },
                    { label: '6 Months (180d)', days: 180 },
                    { label: '1 Year (365d)', days: 365 },
                  ].map((chip) => (
                    <Pressable
                      key={chip.days}
                      style={[
                        styles.daysChip,
                        instantDays === chip.days && styles.daysChipSelected,
                      ]}
                      onPress={() => setInstantDays(chip.days)}
                    >
                      <Text style={[styles.daysChipText, instantDays === chip.days && styles.daysChipTextSelected]}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.grantVipBtn, grantingVip && { opacity: 0.6 }]}
                  onPress={handleInstantGrantVip}
                  disabled={grantingVip}
                >
                  {grantingVip ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.grantBtnContent}>
                      <Crown size={16} color="#FFF" />
                      <Text style={styles.grantBtnText}>Approve & Activate VIP Access</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <CheckCircle2 size={40} color="#00E676" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
                  No Pending Approvals!
                </Text>
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  All VIP transfers and voucher submissions are up to date.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.approvalCard}>
                <View style={styles.approvalHeader}>
                  <View>
                    <Text style={styles.approvalUserEmail}>{item.metadata?.user_email || 'User'}</Text>
                    <Text style={styles.approvalPlanTitle}>
                      Plan: <Text style={{ color: '#FFB800', fontWeight: '800' }}>{item.metadata?.plan_title || item.plan_id}</Text> · {item.amount_iqd.toLocaleString()} IQD
                    </Text>
                  </View>

                  <View style={styles.approvalMethodBadge}>
                    <Text style={styles.approvalMethodText}>
                      {(item.metadata?.method || 'Transfer').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.approvalDetailsBox}>
                  <Text style={styles.approvalDetailRow}>
                    <Text style={styles.detailLabel}>Reference / PIN: </Text>
                    <Text style={styles.detailValue}>{item.metadata?.transaction_ref || item.metadata?.voucher_pin || item.rasedi_order_id}</Text>
                  </Text>
                  {item.metadata?.sender_phone && (
                    <Text style={styles.approvalDetailRow}>
                      <Text style={styles.detailLabel}>Sender Phone: </Text>
                      <Text style={styles.detailValue}>{item.metadata?.sender_phone}</Text>
                    </Text>
                  )}
                  <Text style={styles.approvalDetailRow}>
                    <Text style={styles.detailLabel}>Date: </Text>
                    <Text style={styles.detailValue}>{new Date(item.created_at).toLocaleString()}</Text>
                  </Text>
                </View>

                <View style={styles.approvalActionRow}>
                  <Pressable
                    style={[styles.approveBtn, actionLoadingId === item.id && { opacity: 0.6 }]}
                    onPress={() => handleApprovePayment(item)}
                    disabled={actionLoadingId === item.id}
                  >
                    {actionLoadingId === item.id ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#FFF" />
                        <Text style={styles.approveBtnText}>Approve VIP (+{item.duration_days} Days)</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[styles.rejectBtn, actionLoadingId === item.id && { opacity: 0.6 }]}
                    onPress={() => handleRejectPayment(item)}
                    disabled={actionLoadingId === item.id}
                  >
                    <XCircle size={16} color="#FF4D4D" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242436',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
  },
  adminTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  adminTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminTabActive: {
    backgroundColor: '#1E1E2C',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  adminTabText: {
    color: '#8E8EA4',
    fontSize: 13,
    fontWeight: '700',
  },
  adminTabTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  pendingBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC4899',
  },
  approvalCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 12,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  approvalUserEmail: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  approvalPlanTitle: {
    color: '#8E8EA4',
    fontSize: 12,
    marginTop: 2,
  },
  approvalMethodBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  approvalMethodText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  approvalDetailsBox: {
    backgroundColor: '#0D0D15',
    padding: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1E1E2C',
  },
  approvalDetailRow: {
    fontSize: 12,
  },
  detailLabel: {
    color: '#8E8EA4',
    fontWeight: '700',
  },
  detailValue: {
    color: '#FFF',
    fontWeight: '600',
  },
  approvalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3E1012',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4D4D',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  rejectBtnText: {
    color: '#FF4D4D',
    fontSize: 13,
    fontWeight: '800',
  },
  instantVipCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFB800',
    gap: 10,
  },
  instantVipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  instantVipTitle: {
    color: '#FFB800',
    fontSize: 15,
    fontWeight: '800',
  },
  instantVipSub: {
    color: '#8E8EA4',
    fontSize: 11,
    marginTop: 2,
  },
  instantVipInputLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  instantVipInput: {
    backgroundColor: '#0D0D15',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 13,
  },
  daysChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  daysChip: {
    backgroundColor: '#0D0D15',
    borderWidth: 1,
    borderColor: '#262638',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  daysChipSelected: {
    backgroundColor: '#261F0E',
    borderColor: '#FFB800',
  },
  daysChipText: {
    color: '#8E8EA4',
    fontSize: 11,
    fontWeight: '700',
  },
  daysChipTextSelected: {
    color: '#FFB800',
    fontWeight: '800',
  },
  grantVipBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  grantBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grantBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
