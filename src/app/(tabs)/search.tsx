import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { Search as SearchIcon, X, Heart, Play, Sparkles } from 'lucide-react-native';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { DEFAULT_CATALOG, CATEGORIES } from './index';
import { useResponsive } from '@/hooks/useResponsive';

const GENRES = ['All', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themeColors = useTheme();
  const { width } = useWindowDimensions();
  const { language } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth, isDesktop } = useResponsive();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MediaCategory>((params.category as MediaCategory) || 'All');
  const [selectedGenre, setSelectedGenre] = useState((params.genre as string) || 'All');

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category as MediaCategory);
    if (params.genre) setSelectedGenre(params.genre as string);
  }, [params.category, params.genre]);
  const [mediaList, setMediaList] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 1500)
        );

        const fetchPromise = supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false });

        const result = (await Promise.race([fetchPromise, timeoutPromise])) as any;
        const { data, error } = result || {};

        let combined: AnimeItem[] = [];
        const safeData = (!error && data) ? data : [];
        
        const customItems = safeData
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => ({
            ...item,
            category: item.category || 'Anime Series',
            ...(overrides[item.id] || {}),
          })) as AnimeItem[];
          
        const defaultItems = DEFAULT_CATALOG
          .filter((d) => !deletedIds.includes(d.id))
          .map((d) => ({ ...d, ...(overrides[d.id] || {}) }));
          
        const newLocalItems = Object.values(overrides)
          .filter((override: any) => !deletedIds.includes(override.id) && !safeData.some((d: any) => d.id === override.id) && !DEFAULT_CATALOG.some(d => d.id === override.id)) as AnimeItem[];

        combined = [...newLocalItems, ...customItems, ...defaultItems];

              if (combined.length === 0) {
        const fetchJson = async (url: string, options?: any) => {
          try {
            const r = await fetch(url, options);
            return r.ok ? await r.json() : null;
          } catch {
            return null;
          }
        };
        const [ghibliRes, kitsuRes1, kitsuRes2, tvRes, anilistRes] = await Promise.all([
          fetchJson('https://ghibliapi.vercel.app/films').catch(() => null),
          fetchJson('https://kitsu.io/api/edge/anime?page[limit]=20&sort=-averageRating').catch(() => null),
          fetchJson('https://kitsu.io/api/edge/anime?page[limit]=20&page[offset]=20&sort=-averageRating').catch(() => null),
          fetchJson('https://api.tvmaze.com/shows?page=0').catch(() => null),
          fetchJson('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              query: 'query { Page(perPage: 20) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji english } coverImage { large } genres episodes description } } }',
            }),
          }).catch(() => null),
        ]);
        const ghibliItems = (Array.isArray(ghibliRes) ? ghibliRes : []).slice(0, 22).map((f: any, i: number) => ({
          id: `ghibli-${f.id || i}`,
          title: f.title,
          description: f.description || null,
          image_url: f.image || null,
          episodes: 1,
          genre: 'Fantasy',
          category: 'Anime Movies',
          is_featured: i < 4,
          published_at: f.release_date ? `${f.release_date}-01-01` : null,
        }));
        const kitsuList = [...(kitsuRes1?.data || []), ...(kitsuRes2?.data || [])];
        const kitsuItems = kitsuList.map((k: any) => {
          const a = k.attributes || {};
          return {
            id: `kitsu-${k.id}`,
            title: (a.titles && a.titles.en) || a.canonicalTitle || 'Untitled',
            description: a.synopsis || null,
            image_url: (a.posterImage && (a.posterImage.large || a.posterImage.original)) || null,
            episodes: a.episodeCount || 1,
            genre: 'Anime',
            category: a.subtype === 'movie' ? 'Anime Movies' : 'Anime Series',
            is_featured: false,
            published_at: a.startDate || null,
          };
        });
        const anilistItems = (anilistRes?.data?.Page?.media || []).map((m: any) => ({
          id: `anilist-${m.id}`,
          title: m.title?.english || m.title?.romaji || 'Untitled',
          description: m.description ? m.description.replace(/<[^>]*>/g, '') : null,
          image_url: m.coverImage?.large || null,
          episodes: m.episodes || 1,
          genre: m.genres?.[0] || 'Anime',
          category: 'Anime Series',
          is_featured: false,
          published_at: null,
        }));
        const tvItems = (Array.isArray(tvRes) ? tvRes : []).slice(0, 40).map((s: any) => ({
          id: `tvmaze-${s.id}`,
          title: s.name,
          description: s.summary ? s.summary.replace(/<[^>]*>/g, '') : null,
          image_url: s.image?.original || s.image?.medium || null,
          episodes: 1,
          genre: s.genres?.[0] || 'Drama',
          category: 'Drama',
          is_featured: false,
          published_at: s.premiered || null,
        }));
        combined = [...ghibliItems, ...kitsuItems, ...anilistItems, ...tvItems];
      }
      setMediaList(combined);
      } catch (err) {
        console.warn('Error loading search data:', err);
        setMediaList(DEFAULT_CATALOG);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredList = mediaList.filter((item) => {
    const matchesQuery =
      query.trim() === '' ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.genre && item.genre.toLowerCase().includes(query.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    const matchesGenre =
      selectedGenre === 'All' ||
      (item.genre && item.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

    return matchesQuery && matchesCategory && matchesGenre;
  });

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const renderCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    return (
      <View style={[styles.card, { backgroundColor: themeColors.backgroundCard, width: cardWidth }]}>
        <Pressable onPress={() => handleWatch(item.id)} style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_IMAGES[0] }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={[styles.playCircle, { backgroundColor: themeColors.primary }]}>
              <Play color="#fff" size={16} fill="#fff" />
            </View>
          </View>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            style={styles.heartButton}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#0356C5' : '#fff'}
              fill={favorited ? '#0356C5' : 'rgba(0,0,0,0.5)'}
              size={18}
            />
          </Pressable>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.episodes > 1 ? `${item.episodes} EPS` : 'MOVIE'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={isDesktop ? 1 : 2}>
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>
          <Text style={[styles.cardGenre, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? item.category ?? 'Stream'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {/* 🔍 Search Input Bar */}
        <View style={styles.searchHeader}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.backgroundElement,
                maxWidth: isDesktop ? 680 : undefined,
                alignSelf: isDesktop ? 'center' : undefined,
                width: '100%',
              },
            ]}
          >
            <SearchIcon color={themeColors.textSecondary} size={20} />
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={themeColors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
                <X color={themeColors.textSecondary} size={18} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
            {/* 🎬 Grid of Results */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredList}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCard}
                numColumns={numCols}
                key={`search-grid-${numCols}`}
                columnWrapperStyle={numCols > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
                contentContainerStyle={[styles.grid, { padding: pagePad, paddingTop: 12, paddingBottom: 40 }]}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Sparkles color={themeColors.textSecondary} size={48} />
                    <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{t('noResults')}</Text>
                    <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                      {t('attemptDifferentSearch')}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#242436',
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderColor: '#222232',
    paddingVertical: 12,
  },
  genreScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  genreChipActive: {
    borderColor: 'transparent',
  },
  genreChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    position: 'relative',
    backgroundColor: '#12121A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    // @ts-ignore
    textShadow: '0px 1px 3px rgba(0,0,0,0.8)',
  },
  cardGenre: {
    fontSize: 11,
    marginTop: 4,
    // @ts-ignore
    textShadow: '0px 1px 3px rgba(0,0,0,0.8)',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
