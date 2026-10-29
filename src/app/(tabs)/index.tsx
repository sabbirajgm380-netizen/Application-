import { AdMobBanner } from '@/components/AdMobBanner';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { RewardsHubModal } from '@/components/RewardsHubModal';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { AnimeItem, MediaCategory, useFavorites } from '@/hooks/useFavorites';
import { useGamification } from '@/hooks/useGamification';
import { useResponsive } from '@/hooks/useResponsive';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ChevronLeft,
    ChevronRight,
    Crown,
    Film,
    Flame,
    Heart,
    Menu,
    Play,
    Sparkles,
    Star
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from './_layout';

export const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: string }[] = [
  { id: 'All', label: 'All', icon: '🌟' },
  { id: 'Movies', label: 'Movies', icon: '🎬' },
  { id: 'Anime Movies', label: 'Anime Movies', icon: '🎌' },
  { id: 'K-Drama', label: 'K-Drama', icon: '🌸' },
  { id: 'Drama', label: 'Drama', icon: '🎭' },
  { id: 'Anime Series', label: 'Anime Series', icon: '⚡' },
];

const GENRES = ['All', '🔥 Trending', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

const PLACEHOLDER_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
];

export const DEFAULT_CATALOG: AnimeItem[] = [];

export default function HomeScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { t, language, toggleLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { coins, streakDays, level, activeEvent, isVIP, vipDaysRemaining } = useGamification();
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const {
    heroHeight,
    railCardWidth,
    railCardHeight,
    rankedCardWidth,
    rankedCardHeight,
    maxContentWidth,
    isDesktop,
    isTablet,
  } = useResponsive();
  
  const { openSidebar } = useSidebar();

  const [allMedia, setAllMedia] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [activeCategory, setActiveCategory] = useState<'All' | MediaCategory>('All');
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedMediaRef = useRef(false);

  const getCategoryLabel = (id: string, defaultLabel: string) => {
    if (id === 'All') return t('catAll', defaultLabel);
    if (id === 'Movies') return t('catMovies', defaultLabel);
    if (id === 'Anime Movies') return t('catAnimeMovies', defaultLabel);
    if (id === 'K-Drama') return t('catKDrama', defaultLabel);
    if (id === 'Drama') return t('catDrama', defaultLabel);
    if (id === 'Anime Series') return t('catAnimeSeries', defaultLabel);
    return defaultLabel;
  };

  const fetchMedia = async () => {
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
        .select('id, title, description, image_url, episodes, genre, category, is_featured, created_at')
        .order('created_at', { ascending: false });

      const result = (await Promise.race([fetchPromise, timeoutPromise])) as any;
      const { data, error } = result || {};
      let combined: AnimeItem[] = [];
      const deleted = deletedIds.map(String);
      const safeData = (!error && data) ? data : [];
      
      const customItems = safeData
        .filter((item: any) => !deleted.includes(String(item.id)))
        .map((item: any) => ({
          ...item,
          category: item.category || 'Anime Series',
          published_at: item.published_at || item.created_at || null,
          ...(overrides[String(item.id)] || {}),
        })) as AnimeItem[];
        
      const defaultItems = DEFAULT_CATALOG
        .filter((d) => !deleted.includes(String(d.id)))
        .map((d) => ({ ...d, ...(overrides[String(d.id)] || {}) }));
        
      const newLocalItems = Object.values(overrides)
        .filter((override: any) => !deleted.includes(String(override.id)) && !safeData.some((d: any) => String(d.id) === String(override.id)) && !DEFAULT_CATALOG.some(d => String(d.id) === String(override.id))) as AnimeItem[];

      combined = [...newLocalItems, ...customItems, ...defaultItems];

      // Demo preview only (fork): when Supabase returns nothing, fill from free public APIs (no key needed). Each API is fetched independently so one failing API does not empty the others.
      if (combined.length === 0) {
        const fetchJson = async (url) => {
          try {
            const r = await fetch(url);
            return r.ok ? await r.json() : [];
          } catch {
            return [];
          }
        };
        const [ghibliRes, kitsuRes1, kitsuRes2, tvRes] = await Promise.all([
          fetchJson('https://ghibliapi.vercel.app/films'),
          fetchJson('https://kitsu.io/api/edge/anime?page[limit]=20&sort=-averageRating'),
          fetchJson('https://kitsu.io/api/edge/anime?page[limit]=20&page[offset]=20&sort=-averageRating'),
          fetchJson('https://api.tvmaze.com/shows?page=0'),
        ]);
        const ghibliItems = (Array.isArray(ghibliRes) ? ghibliRes : []).slice(0, 22).map((f, i) => ({
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
        const kitsuItems = kitsuList.map((k) => {
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
        const tvItems = (Array.isArray(tvRes) ? tvRes : []).slice(0, 40).map((s) => ({
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
        combined = [...ghibliItems, ...kitsuItems, ...tvItems];
      }

      setAllMedia(combined);
    } catch (err) {
      console.warn('Error fetching media:', err);
      hasLoadedMediaRef.current = false;
      setAllMedia(DEFAULT_CATALOG);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedMediaRef.current) return;
      hasLoadedMediaRef.current = true;
      fetchMedia();
    }, [])
  );

  // Filter media by Category
  const categoryFiltered =
    activeCategory === 'All'
      ? allMedia
      : allMedia.filter((item) => item.category === activeCategory);

  // Featured Carousel List
  const featured = categoryFiltered.filter((a) => a.is_featured).length > 0
    ? categoryFiltered.filter((a) => a.is_featured)
    : categoryFiltered.slice(0, 4);

  // Genre filtered media
  const genreFiltered = categoryFiltered.filter((item) => {
    if (activeGenre === 'All' || activeGenre === '🔥 Trending') return true;
    return item.genre?.toLowerCase().includes(activeGenre.toLowerCase());
  });

  // Rails by Category
  const moviesRail = allMedia.filter((item) => item.category === 'Movies');
  const animeMoviesRail = allMedia.filter((item) => item.category === 'Anime Movies');
  const kdramaRail = allMedia.filter((item) => item.category === 'K-Drama');
  const dramaRail = allMedia.filter((item) => item.category === 'Drama');
  const animeSeriesRail = allMedia.filter((item) => item.category === 'Anime Series');
  const newProducts = allMedia
    .filter((item) => {
      const pubDate = item.published_at || (item as any).created_at;
      if (!pubDate) return false;
      const publishedAt = new Date(pubDate).getTime();
      const now = new Date().getTime();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      return Number.isFinite(publishedAt) && publishedAt >= thirtyDaysAgo;
    })
    .sort((a, b) => {
      const dateA = new Date(a.published_at || (a as any).created_at || 0).getTime();
      const dateB = new Date(b.published_at || (b as any).created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 12);

  // Auto-sliding Hero timer: 4 seconds
  useEffect(() => {
    if (featured.length <= 1) return;

    const isNativeDriver = Platform.OS !== 'web';

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: isNativeDriver,
      }).start(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % featured.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: isNativeDriver,
        }).start();
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [featured, fadeAnim]);

  const goToSlide = (newIndex: number) => {
    const isNativeDriver = Platform.OS !== 'web';
    Animated.timing(fadeAnim, {
      toValue: 0.2,
      duration: 200,
      useNativeDriver: isNativeDriver,
    }).start(() => {
      setCurrentHeroIndex(newIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: isNativeDriver,
      }).start();
    });
  };

  const nextHero = () => {
    if (featured.length === 0) return;
    goToSlide((currentHeroIndex + 1) % featured.length);
  };

  const prevHero = () => {
    if (featured.length === 0) return;
    goToSlide((currentHeroIndex - 1 + featured.length) % featured.length);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMedia();
  }, []);

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const activeHeroItem = featured[currentHeroIndex] || DEFAULT_CATALOG[0];
  const activeHeroFavorited = activeHeroItem ? isFavorite(activeHeroItem.id) : false;

  const renderRankedCard = ({ item, index }: { item: AnimeItem; index: number }) => {
    const favorited = isFavorite(item.id);
    return (
      <Pressable
        style={[styles.rankedCardContainer, { width: rankedCardWidth + 24 }]}
        onPress={() => handleWatch(item.id)}
      >
        <Text style={[styles.rankNumber, { fontSize: isTablet || isDesktop ? 54 : 44 }]}>
          {index + 1}
        </Text>
        <View
          style={[
            styles.posterCard,
            {
              backgroundColor: themeColors.backgroundCard,
              width: rankedCardWidth,
              height: rankedCardHeight,
            },
          ]}
        >
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
            style={styles.posterImage}
            resizeMode="cover"
          />
          {item.category && (
            <View style={styles.cardCategoryBadge}>
              <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            style={styles.cardHeartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#0356C5' : '#fff'}
              fill={favorited ? '#0356C5' : 'rgba(0,0,0,0.4)'}
              size={16}
            />
          </Pressable>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={isDesktop ? 1 : 2}>
              {language === 'ku' && item.title_ku ? item.title_ku : item.title}
            </Text>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.episodes > 1 ? `${item.episodes} ${t('episodes', 'Episodes')}` : t(item.genre as any, item.genre || '') ?? t('movie', 'Movie')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    return (
      <Pressable
        style={[
          styles.standardCard,
          {
            backgroundColor: themeColors.backgroundCard,
            width: railCardWidth,
          },
        ]}
        onPress={() => handleWatch(item.id)}
      >
        <View style={[styles.standardImageWrapper, { width: railCardWidth, height: railCardHeight }]}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
            style={styles.standardImage}
            resizeMode="cover"
          />
          {item.category && (
            <View style={styles.cardCategoryBadge}>
              <Text style={styles.cardCategoryText}>{getCategoryLabel(item.category, item.category).toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            style={styles.cardHeartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#0356C5' : '#fff'}
              fill={favorited ? '#0356C5' : 'rgba(0,0,0,0.4)'}
              size={16}
            />
          </Pressable>
          <View style={styles.epBadge}>
            <Text style={styles.epBadgeText}>
              {item.episodes > 1 ? `${item.episodes} ${t('ep', 'EPS')}` : t('movie', 'MOVIE')}
            </Text>
          </View>
        </View>
        <View style={styles.standardCardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={isDesktop ? 1 : 2}>
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {t(item.genre as any, item.genre || '') ?? getCategoryLabel(item.category || '', item.category || '') ?? t('movie', 'Stream')}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {/* Top Brand Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.brandRow}>
            {!isDesktop && (
              <Pressable onPress={openSidebar} style={{ marginRight: 12 }}>
                <Menu color="#fff" size={26} />
              </Pressable>
            )}
            <View style={[styles.brandIcon, { backgroundColor: themeColors.primary, overflow: 'hidden' }]}>
              <PrimaryGradient borderRadius={8} />
              <Sparkles color="#fff" size={18} />
            </View>
            <Text style={[styles.brandName, { color: themeColors.text }]}>
              ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
            </Text>
          </View>

          {/* Quick Category indicator / tagline on larger screens */}
          {isDesktop && (
            <View style={styles.desktopTagline}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {t('desktopTagline', 'Unlimited Anime, Movies, K-Dramas & Series in Ultra HD')}
              </Text>
            </View>
          )}

          <View style={styles.homeActions}>
            {/* 👑 VIP Sovereign Subscription Button */}
            <Pressable
              style={styles.vipHeaderBtn}
              onPress={() => setShowVipModal(true)}
            >
              <Crown size={15} color="#FFB800" />
              <Text style={styles.vipHeaderBtnText}>
                {isVIP ? `VIP (${vipDaysRemaining} ${t('days', 'd')})` : 'VIP'}
              </Text>
            </Pressable>
          </View>
        </View>





        {/* 🎬 Animated Auto-Moving Hero Banner */}
        {featured.length > 0 && (
          <View style={[styles.heroSection, { height: heroHeight }]}>
            <Animated.View style={[styles.heroSlide, { height: heroHeight, opacity: fadeAnim }]}>
              <Image
                source={{ uri: activeHeroItem.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
                style={styles.heroBackdrop}
                resizeMode="cover"
              />
              <View style={styles.heroDarkGradient} />

              <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
                {/* Badges Row */}
                <View style={styles.heroBadges}>
                  <View style={[styles.pillBadge, { backgroundColor: themeColors.primary, overflow: 'hidden' }]}>
                    <PrimaryGradient borderRadius={20} />
                    <Text style={styles.pillBadgeText}>
                      {activeHeroItem.category ? getCategoryLabel(activeHeroItem.category, activeHeroItem.category).toUpperCase() : t('featured', 'FEATURED')}
                    </Text>
                  </View>
                  <View style={styles.pillGlass}>
                    <Text style={styles.pillGlassText}>4K ULTRA HD</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Star color="#FFB800" size={12} fill="#FFB800" />
                    <Text style={styles.ratingText}>9.8</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.heroTitle,
                    { fontSize: isDesktop ? 34 : isTablet ? 28 : 24 },
                  ]}
                  numberOfLines={2}
                >
                  {language === 'ku' && activeHeroItem.title_ku ? activeHeroItem.title_ku : activeHeroItem.title}
                </Text>

                {activeHeroItem.description ? (
                  <Text
                    style={[
                      styles.heroDesc,
                      { maxWidth: isDesktop ? 650 : isTablet ? 500 : undefined },
                    ]}
                    numberOfLines={isDesktop ? 3 : 2}
                  >
                    {language === 'ku' && activeHeroItem.description_ku ? activeHeroItem.description_ku : activeHeroItem.description}
                  </Text>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.heroActions}>
                  <Pressable
                    style={[styles.playBtn, { backgroundColor: themeColors.primary, overflow: 'hidden' }]}
                    onPress={() => handleWatch(activeHeroItem.id)}
                  >
                    <PrimaryGradient borderRadius={30} />
                    <Play color="#fff" size={18} fill="#fff" />
                    <Text style={styles.playBtnText}>{t('watchNow', 'Watch Now')}</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.listBtn,
                      { backgroundColor: activeHeroFavorited ? '#02060E' : 'rgba(255,255,255,0.18)' },
                    ]}
                    onPress={() => toggleFavorite(activeHeroItem)}
                  >
                    <Heart
                      color={activeHeroFavorited ? themeColors.primary : '#fff'}
                      fill={activeHeroFavorited ? themeColors.primary : 'none'}
                      size={18}
                    />
                    <Text
                      style={[
                        styles.listBtnText,
                        { color: activeHeroFavorited ? themeColors.primary : '#fff' },
                      ]}
                    >
                      {activeHeroFavorited ? t('inList', 'In My List') : `+ ${t('addToList', 'My List')}`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>

            {/* Left / Right Carousel Chevrons */}
            <Pressable style={[styles.navArrow, styles.navArrowLeft]} onPress={prevHero}>
              <ChevronLeft color="#fff" size={24} />
            </Pressable>
            <Pressable style={[styles.navArrow, styles.navArrowRight]} onPress={nextHero}>
              <ChevronRight color="#fff" size={24} />
            </Pressable>

            {/* Indicator Dots */}
            <View style={styles.indicatorRow}>
              {featured.map((_, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => goToSlide(idx)}
                    style={[
                      styles.dot,
                      idx === currentHeroIndex
                        ? [styles.activeDot, { backgroundColor: themeColors.primary, overflow: 'hidden' }]
                        : { backgroundColor: 'rgba(255,255,255,0.3)' },
                    ]}
                  >
                    {idx === currentHeroIndex && <PrimaryGradient borderRadius={4} />}
                  </Pressable>
              ))}
            </View>
          </View>
        )}

        {activeCategory !== 'All' ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Flame color={themeColors.primary} size={20} />
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  {getCategoryLabel(activeCategory, activeCategory)} {activeGenre !== 'All' ? `· ${t(activeGenre as any, activeGenre)}` : ''}
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                {genreFiltered.length} Titles
              </Text>
            </View>
            <View style={[styles.standardList, { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 10 }]}>
              {genreFiltered.map((item) => {
                const card = renderStandardCard({ item });
                return (
                  <View key={`grid-cat-${item.id}`}>
                    {card}
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          /* When "All" is chosen, show organized categorized sections */
          <>
            {allMedia.length > 0 && (
              <View style={[styles.standardList, { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 20 }]}>
                {allMedia.map((item) => {
                  const card = renderStandardCard({ item });
                  return (
                    <View key={`grid-${item.id}`}>
                      {card}
                    </View>
                  );
                })}
              </View>
            )}

            {allMedia.length === 0 && (
              <View style={{ padding: 32, alignItems: 'center', marginHorizontal: 16, marginTop: 24, borderRadius: 16, backgroundColor: themeColors.backgroundCard, borderWidth: 1, borderColor: themeColors.border }}>
                <Film size={44} color={themeColors.primary} style={{ marginBottom: 12 }} />
                <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                  {t('noMediaTitle', 'No Products Published Yet')}
                </Text>
                  <Text style={{ color: themeColors.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 18 }}>
                  {t('noMediaSub', 'Your cinema catalog is clean and ready. Check back soon for new anime, movies, and series.')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* 📢 Google AdMob Platform-Specific Banner Ad */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <AdMobBanner placement="home_bottom" />
        </View>

        <View style={{ height: 40 }} />
      </View>

      {/* 🎁 AniFlix Gamification & Rewards Hub Modal */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />

      {/* 👑 VIP Sovereign Subscription Modal */}
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  desktopTagline: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  homeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rewardsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262638',
    gap: 5,
  },
  streakBadgeText: {
    color: '#0356C5',
    fontSize: 12,
    fontWeight: '800',
  },
  headerDivider: {
    color: '#444458',
    fontSize: 12,
  },
  coinsBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
  },
  levelPill: {
    backgroundColor: '#262010',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFB800',
    marginLeft: 2,
  },
  levelPillText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '900',
  },
  eventMiniBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#181510',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3D3216',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventMiniContent: {
    flex: 1,
    paddingRight: 10,
  },
  eventTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventTag: {
    backgroundColor: '#0356C5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  eventBonusBadge: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
  },
  eventMiniTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  eventMiniSubtitle: {
    color: '#9E9EB4',
    fontSize: 11,
  },
  eventActionBox: {
    backgroundColor: '#2A2210',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  eventActionText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  categoryPillActive: {
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroSection: {
    position: 'relative',
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  heroSlide: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  heroDarkGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 7, 10, 0.65)',
  },
  heroContent: {
    padding: 20,
    paddingBottom: 32,
    zIndex: 5,
  },
  heroContentDesktop: {
    padding: 36,
    paddingBottom: 44,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillGlass: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillGlassText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  listBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navArrow: {
    position: 'absolute',
    top: '45%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  indicatorRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    borderRadius: 3,
  },
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242436',
  },
  genreChipActive: {
    borderColor: 'transparent',
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rankedList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  rankedCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rankNumber: {
    fontWeight: '900',
    color: '#2a2a42',
    lineHeight: 52,
    marginRight: -10,
    // @ts-ignore
    textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
  },
  posterCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 3,
  },
  cardCategoryText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(7, 7, 10, 0.85)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  standardList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  standardCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  standardImageWrapper: {
    position: 'relative',
  },
  standardImage: {
    width: '100%',
    height: '100%',
  },
  epBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  standardCardInfo: {
    padding: 8,
  },
  vipHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#261F0E',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  vipHeaderBtnText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '800',
  },
});
