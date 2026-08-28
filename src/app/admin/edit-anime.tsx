import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { getDeletedMediaIds, getEditedMediaOverrides, updateAnime } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

const CATEGORY_OPTIONS: { id: MediaCategory; label: string; icon: string }[] = [
  { id: 'Movies', label: 'Movies', icon: '🎬' },
  { id: 'Anime Movies', label: 'Anime Movies', icon: '🎌' },
  { id: 'K-Drama', label: 'K-Drama', icon: '🌸' },
  { id: 'Drama', label: 'Drama', icon: '🎭' },
  { id: 'Anime Series', label: 'Anime Series', icon: '⚡' },
];

export default function EditAnimeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { maxContentWidth } = useResponsive();

  const ownerEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'esra99san@gmail.com').toLowerCase();
  const isAdmin = user?.email?.toLowerCase() === ownerEmail;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [episodes, setEpisodes] = useState('1');
  const [episodeLinks, setEpisodeLinks] = useState<{episode: number, url: string}[]>([{episode: 1, url: ''}]);
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<MediaCategory>('Movies');
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        const [overrides, defaultIds] = await Promise.all([
          getEditedMediaOverrides(),
          getDeletedMediaIds()
        ]);

        const { data, error } = await supabase
          .from('anime')
          .select('id, title, description, image_url, video_asset_key, video_url, episodes, genre, category, is_featured')
          .eq('id', id)
          .single();

        let animeData: any = null;
        if (!error && data) {
          animeData = { ...data, ...(overrides[String(id)] || {}) };
        } else if (overrides[String(id)]) {
          animeData = overrides[String(id)];
        }

        if (animeData) {
          setTitle(animeData.title || '');
          setDescription(animeData.description || '');
          setImageUrl(animeData.image_url || '');
          setEpisodes(String(animeData.episodes || 1));
          
          if (animeData.episode_links && Array.isArray(animeData.episode_links)) {
            setEpisodeLinks(animeData.episode_links);
          } else {
            setEpisodeLinks([{ episode: 1, url: animeData.video_asset_key || animeData.video_url || '' }]);
          }

          setGenre(animeData.genre || '');
          setCategory((animeData.category as MediaCategory) || 'Movies');
          setIsFeatured(animeData.is_featured ?? false);
        }
      } catch (_e) {
      } finally {
        setLoadingInitial(false);
      }
    }
    loadItem();
  }, [id]);

  const [newEpNum, setNewEpNum] = useState('');
  const [newEpUrl, setNewEpUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  const handleAddLink = () => {
    setLinkError('');
    const cleanNumStr = newEpNum.replace(/\D/g, '');
    const num = parseInt(cleanNumStr, 10);
    
    if (!cleanNumStr || isNaN(num) || num <= 0) {
      setLinkError('Please enter a valid episode number (e.g. 1).');
      return;
    }
    if (!newEpUrl.trim()) {
      setLinkError('Please enter a valid video URL.');
      return;
    }
    
    setEpisodeLinks(prev => {
      const next = [...prev];
      const existingIdx = next.findIndex(l => l.episode === num);
      if (existingIdx >= 0) {
        next[existingIdx].url = newEpUrl.trim();
      } else {
        next.push({ episode: num, url: newEpUrl.trim() });
      }
      return next.sort((a, b) => a.episode - b.episode);
    });
    setNewEpNum('');
    setNewEpUrl('');
  };

  const handleRemoveLink = (epToRemove: number) => {
    setEpisodeLinks(prev => prev.filter(l => l.episode !== epToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') window.alert('Title is required.');
      else Alert.alert('Error', 'Title is required.');
      return;
    }

    const epsNum = episodes ? parseInt(episodes, 10) : 1;
    if (episodes && isNaN(epsNum)) {
      if (Platform.OS === 'web') window.alert('Episodes must be a number.');
      else Alert.alert('Error', 'Episodes must be a number.');
      return;
    }

    setSaving(true);

    const result = await updateAnime(id as string, {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      episodes: epsNum,
      episode_links: episodeLinks.filter(e => e.url.trim().length > 0),
      genre: genre.trim() || null,
      category: category,
      is_featured: isFeatured,
    });

    setSaving(false);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`Changes to "${title}" have been saved and updated for all users! 🎉`);
      router.replace('/adminpanel');
    } else {
      Alert.alert('Updated! 🎉', `"${title}" has been saved and updated for all users.`, [
        { text: 'Back to Panel', onPress: () => router.replace('/adminpanel') },
      ]);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (authLoading || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={{ maxWidth: 600, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24, alignSelf: 'center', flex: 1 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E1012', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Lock color="#FF4D4D" size={38} />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Access Restricted
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Only the administrator account (<Text style={{ color: '#38BDF8', fontWeight: '700' }}>esra99san@gmail.com</Text>) has permission to edit titles on AniFlix.
          </Text>
          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 }}
            onPress={() => router.push({ pathname: '/(auth)/login', params: { redirect: '/adminpanel' } } as any)}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Log In as Administrator</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: Math.min(maxContentWidth, 750), alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/adminpanel'))}
            style={[styles.backBtn, { backgroundColor: themeColors.backgroundElement }]}
          >
            <ArrowLeft color={themeColors.text} size={20} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.screenTitle, { color: themeColors.text }]}>Edit Media</Text>
            <Text style={[styles.screenSubtitle, { color: themeColors.textSecondary }]}>
              Changes will immediately update on all users&apos; screens
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Title *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="e.g. Solo Leveling Season 2"
            placeholderTextColor={themeColors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Category *</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: selected ? themeColors.primary : themeColors.backgroundElement,
                      borderColor: selected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: selected ? '#ffffff' : themeColors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Episodes & Genre */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>Episodes</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.backgroundElement,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. 24"
              placeholderTextColor={themeColors.textSecondary}
              value={episodes}
              onChangeText={setEpisodes}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 2, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>Genre</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.backgroundElement,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. Action, Fantasy"
              placeholderTextColor={themeColors.textSecondary}
              value={genre}
              onChangeText={setGenre}
            />
          </View>
        </View>

        {/* Image URL */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Cover Image URL</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="https://..."
            placeholderTextColor={themeColors.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
        </View>

        {/* Episode Link Manager */}
        <View style={[styles.fieldGroup, { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#242436', marginBottom: 24 }]}>
          <Text style={[styles.label, { color: themeColors.text }]}>Add or Update Episode Link</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.backgroundElement,
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    marginBottom: 0
                  },
                ]}
                placeholder="Ep #"
                placeholderTextColor={themeColors.textSecondary}
                value={newEpNum}
                onChangeText={setNewEpNum}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 3 }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.backgroundElement,
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    marginBottom: 0
                  },
                ]}
                placeholder="https://...mp4"
                placeholderTextColor={themeColors.textSecondary}
                value={newEpUrl}
                onChangeText={setNewEpUrl}
                autoCapitalize="none"
              />
            </View>
          </View>
          
          {linkError ? <Text style={{ color: '#FF4D4D', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>{linkError}</Text> : null}

          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
            onPress={handleAddLink}
            disabled={saving}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Save Episode Link</Text>
          </Pressable>

          {episodeLinks.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: '700' }}>CURRENTLY ADDED EPISODES:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {episodeLinks.map((link) => (
                  <View key={link.episode} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#242436', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginRight: 6 }}>Ep {link.episode}</Text>
                    <Pressable onPress={() => handleRemoveLink(link.episode)}>
                      <Text style={{ color: '#FF4D4D', fontSize: 16, fontWeight: '900', lineHeight: 16 }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="Write a synopsis..."
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Hero Featured Switch */}
        <View
          style={[
            styles.switchRow,
            {
              backgroundColor: themeColors.backgroundElement,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#FFB800" />
              <Text style={[styles.switchTitle, { color: themeColors.text }]}>Feature in Hero Carousel</Text>
            </View>
            <Text style={[styles.switchSubtitle, { color: themeColors.textSecondary }]}>
              Highlights this media at the very top of the Home screen for all users
            </Text>
          </View>
          <Switch
            value={isFeatured}
            onValueChange={setIsFeatured}
            trackColor={{ false: '#3A3A3C', true: themeColors.primary }}
            thumbColor={isFeatured ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {/* Action Button */}
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: themeColors.primary, opacity: saving ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
