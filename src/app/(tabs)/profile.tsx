import { RewardsHubModal } from '@/components/RewardsHubModal';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { useLanguage } from '@/hooks/use-language';
import { useColorMode, useTheme } from '@/hooks/use-theme';
import { useAdMob } from '@/hooks/useAdMob';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useGamification } from '@/hooks/useGamification';
import { useResponsive } from '@/hooks/useResponsive';
import { useSocial } from '@/hooks/useSocial';
import { useRouter } from 'expo-router';
import {
    Camera,
    Check,
    ChevronRight,
    CreditCard,
    Crown,
    Disc3,
    Globe,
    LogOut,
    Trophy,
    Tv,
    User as UserIcon,
    X
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRESET_AVATARS = [
  { id: '1', name: 'Original Hero', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80' },
  { id: '2', name: 'Shadow Shinobi', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80' },
  { id: '3', name: 'Cyber Samurai', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80' },
  { id: '4', name: 'Solar Legend', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80' },
  { id: '5', name: 'Neon Valkyrie', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80' },
  { id: '6', name: 'Crimson Hunter', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { language, toggleLanguage, t } = useLanguage();
  const { user, profile, signOut, isLoading, updateProfile } = useAuth();
  const { favorites } = useFavorites();
  const { isDesktop, isTablet } = useResponsive();
  const {
    coins,
    xp,
    level,
    levelTitle,
    nextLevelXP,
    currentLevelBaseXP,
    streakDays,
    isVIP,
    vipDaysRemaining,
    badges,
    activeTheme,
  } = useGamification();
  const { followingCount, followersCount } = useSocial();
  const { showRewardedAd } = useAdMob();

  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [showThemeShop, setShowThemeShop] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const handleSelectAvatar = async (url: string) => {
    if (!url.trim()) return;
    setIsUpdatingAvatar(true);
    const { error } = await updateProfile({ avatar_url: url.trim() });
    setIsUpdatingAvatar(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setShowAvatarModal(false);
      setCustomAvatarUrl('');
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: themeColors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={activeTheme?.primary || themeColors.primary} />
      </View>
    );
  }

  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));
  const primaryColor = activeTheme?.primary || themeColors.primary;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
    >
      <View style={[styles.profileCard, (isDesktop || isTablet) && styles.profileCardWide]}>
        {/* 👤 Profile Hero Card */}
        <View style={styles.header}>
          <Pressable
            onPress={() => setShowAvatarModal(true)}
            style={[
              styles.avatarGlow,
              { borderColor: '#242436' },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: themeColors.backgroundCard }]}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <UserIcon color="#fff" size={44} />
              )}
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: primaryColor }]}>
              <Camera size={13} color="#fff" />
            </View>
          </Pressable>

          <Text style={[styles.name, { color: themeColors.text }]}>
            {profile?.full_name ?? user?.email?.split('@')[0] ?? 'AniFlix Member'}
          </Text>
          <Text style={[styles.email, { color: themeColors.textSecondary }]}>
            {user?.email}
          </Text>

          <Pressable
            style={[
              styles.roleBadge,
              { backgroundColor: themeColors.backgroundCard },
            ]}
            onPress={() => setShowVipModal(true)}
          >
            <Tv color={themeColors.accentCyan} size={14} />
            <Text style={styles.roleText}>
              {isVIP ? `${t('vipMember')} (${vipDaysRemaining}d)` : t('standardStreamerGetVip')}
            </Text>
          </Pressable>
        </View>

        {/* 🏆 User Level & XP Progress Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelCardHeader}>
            <View style={styles.levelLeft}>
              <Crown size={16} color="#FFB800" />
              <Text style={styles.levelLabel}>{t('level')} {level}</Text>
            </View>
            <Text style={styles.levelTitle}>{t(levelTitle as any, levelTitle)}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {levelXPProgress} / {levelXPTarget} {t('xpToLevel', 'XP to Level')} {level + 1}
          </Text>
        </View>

        {/* 📊 Gamification & Social Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#FFD700' }]}>💰 {coins}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('coins', 'Coins')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#FF5722' }]}>🔥 {streakDays}d</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('streak', 'Streak')}</Text>
          </View>

          <Pressable
            style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}
            onPress={() => router.push('/(tabs)/favorites' as any)}
          >
            <Text style={[styles.statNumber, { color: themeColors.primary }]}>
              {favorites.length}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('favorites', 'Favorites')}</Text>
          </Pressable>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#00D2FF' }]}>👥 {followingCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('following')}</Text>
          </View>
        </View>

        {/* 🎁 Rewards & Missions Banner */}
        <Pressable 
            style={[styles.menuItem, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
            onPress={() => setShowRewardsModal(true)}
          >
            <ChevronRight color={themeColors.textSecondary} size={20} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>{t('rewardsHub')}</Text>
              <Text style={styles.menuItemSub}>{t('rewardsSub')}</Text>
            </View>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
              <Trophy color="#FFB800" size={20} />
            </View>
          </Pressable>

          {/* Achievement Badges Section */}
          <View style={styles.badgesSection}>
            <View style={styles.badgesHeader}>
              <Text style={styles.badgesSectionTitle}>{t('myBadges')}</Text>
              <Pressable onPress={() => setShowRewardsModal(true)}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badgePill,
                    !b.isUnlocked && styles.badgePillLocked,
                    { backgroundColor: themeColors.backgroundCard },
                  ]}
                >
                  <Text style={styles.badgePillEmoji}>{b.icon}</Text>
                  <View>
                    <Text style={styles.badgePillTitle}>{t(b.title as any, b.title)}</Text>
                    <Text style={styles.badgePillStatus}>
                      {b.isUnlocked ? t('unlocked') : t('locked')}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

        {/* ⚙️ Actions List */}
        <View style={styles.actionsSection}>
          {/* Dedicated FIB Payment Screen Link */}
          {!isVIP && (
            <Pressable 
              style={[styles.menuItem, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
              onPress={() => router.push('/fib-payment' as any)}
            >
              <ChevronRight color={themeColors.textSecondary} size={20} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>
                  {language === 'ku' ? 'پارەدان لە ڕێگەی FIB' : 'VIP Subscription (FIB)'}
                </Text>
                <Text style={styles.menuItemSub}>
                  {language === 'ku' ? 'پارەدان بۆ VIP لە ڕێگەی بانکی یەکەمی عێراقی' : 'Upgrade to VIP using First Iraqi Bank'}
                </Text>
              </View>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <CreditCard color="#38BDF8" size={20} />
              </View>
            </Pressable>
          )}

          {/* 📺 Watch Ad for Coins */}
          <Pressable 
            style={[styles.menuItem, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
            onPress={() => showRewardedAd({ rewardCoins: 100, rewardType: 'coins' })}
          >
            <ChevronRight color={themeColors.textSecondary} size={20} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>{t('watchAdEarn')}</Text>
              <Text style={styles.menuItemSub}>{t('watchAdSub')}</Text>
            </View>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
              <Disc3 color="#FFB800" size={20} />
            </View>
          </Pressable>



          {/* 🌐 Language Switcher (English ⇄ کوردی سۆرانی) */}
          <Pressable 
            style={[styles.menuItem, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
            onPress={toggleLanguage}
          >
            <View style={{ backgroundColor: '#00D2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>
                {language === 'ku' ? 'KU / ک' : 'EN'}
              </Text>
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>
                {t('languageSetting')}
              </Text>
              <Text style={styles.menuItemSub}>
                {t('switchLanguageSub')}
              </Text>
            </View>
            <View style={[styles.menuIconBox, { backgroundColor: language === 'ku' ? '#1E293B' : '#0F172A' }]}>
              <Globe color="#00D2FF" size={20} />
            </View>
          </Pressable>

          {/* Sign Out Button */}
          <Pressable 
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <LogOut color="#0356C5" size={20} />
            <Text style={styles.logoutText}>{t('signOut')}</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </View>

      {/* Rewards & Quests Modal */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />

      {/* 🖼️ Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.avatarModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Avatar</Text>
              <Pressable onPress={() => setShowAvatarModal(false)} style={styles.closeBtn}>
                <X size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.avatarModalContent}>
              <Text style={styles.avatarSubTitle}>Select an official AniFlix Anime Avatar:</Text>
              <View style={styles.presetGrid}>
                {PRESET_AVATARS.map((av) => {
                  const isSelected = profile?.avatar_url === av.url;
                  return (
                    <Pressable
                      key={av.id}
                      style={[
                        styles.presetItem,
                        isSelected && { borderColor: primaryColor, borderWidth: 2 },
                      ]}
                      onPress={() => handleSelectAvatar(av.url)}
                      disabled={isUpdatingAvatar}
                    >
                      <Image source={{ uri: av.url }} style={styles.presetImage} resizeMode="cover" />
                      <Text style={styles.presetName} numberOfLines={1}>
                        {av.name}
                      </Text>
                      {isSelected && (
                        <View style={[styles.selectedCheck, { backgroundColor: primaryColor }]}>
                          <Check size={12} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.avatarSubTitle, { marginTop: 18 }]}>Or paste custom photo URL:</Text>
              <View style={styles.customUrlRow}>
                <TextInput
                  style={styles.customUrlInput}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#777"
                  value={customAvatarUrl}
                  onChangeText={setCustomAvatarUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={[
                    styles.customUrlBtn,
                    { backgroundColor: primaryColor },
                    (!customAvatarUrl.trim() || isUpdatingAvatar) && { opacity: 0.5 },
                  ]}
                  disabled={!customAvatarUrl.trim() || isUpdatingAvatar}
                  onPress={() => handleSelectAvatar(customAvatarUrl)}
                >
                  {isUpdatingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.customUrlBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    width: '100%',
    alignSelf: 'center',
  },
  profileCardWide: {
    maxWidth: 680,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  avatarGlow: {
    padding: 4,
    borderRadius: 56,
    borderWidth: 2,
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelCard: {
    backgroundColor: '#161622',
    marginHorizontal: 16,
    borderRadius: 20, // more rounded
    padding: 20, // larger padding
    borderWidth: 1,
    borderColor: '#222232',
    marginBottom: 20,
    boxShadow: '0px 4px 5px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#262010',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  levelLabel: {
    color: '#FFB800',
    fontWeight: '800',
    fontSize: 11,
  },
  levelTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  xpTrack: {
    height: 6,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 10,
    color: '#7B7B92',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#222232',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  rewardsBanner: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rewardsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  rewardsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262010',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  rewardsBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  rewardsBannerSub: {
    fontSize: 11,
    color: '#9E9EB4',
    lineHeight: 15,
  },
  badgesSection: {
    marginBottom: 18,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  badgesSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#707086',
    letterSpacing: 1.2,
  },
  seeAllBadges: {
    fontSize: 11,
    color: '#FFB800',
    fontWeight: '700',
  },
  badgesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  badgePillLocked: {
    opacity: 0.45,
  },
  badgePillEmoji: {
    fontSize: 18,
  },
  badgePillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  badgePillStatus: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBannerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  adminBannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#222232',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#8E8EA4',
    marginTop: 1,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  menuItemContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'right',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#8E8EA4',
    textAlign: 'right',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 20,
    backgroundColor: 'rgba(3, 86, 197, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(3, 86, 197, 0.3)',
  },
  logoutText: {
    color: '#0356C5',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#07070A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  avatarModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#0C0C14',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContent: {
    padding: 20,
  },
  avatarSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A0A0B8',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  presetItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#13131F',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#202032',
    position: 'relative',
  },
  presetImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 6,
  },
  presetName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customUrlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customUrlInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#13131F',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#202032',
  },
  customUrlBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customUrlBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0356C5',
  },
});
