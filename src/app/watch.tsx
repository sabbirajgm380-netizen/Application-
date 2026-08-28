import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import {
  Shield,
  Heart,
  Star,
  Play,
  Pause,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Gauge,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getPlaybackUrl } from '@/lib/playback';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { useFavorites, AnimeItem } from '@/hooks/useFavorites';
import { useReviews } from '@/hooks/useReviews';
import { useGamification } from '@/hooks/useGamification';
import { DEFAULT_CATALOG } from './(tabs)/index';
import { useResponsive } from '@/hooks/useResponsive';
import { ReviewsSection } from '@/components/ReviewsSection';
import { AdMobBanner } from '@/components/AdMobBanner';

const SPEED_OPTIONS = [0.25, 0.5, 1.0, 1.25, 1.5, 2.0, 4.0];

export default function WatchScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getStatsForMedia } = useReviews();
  const { awardWatchTimeReward } = useGamification();
  const { maxContentWidth, railCardWidth, railCardHeight, isDesktop, isTablet } = useResponsive();
  const { language } = useLanguage();
  const awardWatchTimeRewardRef = useRef(awardWatchTimeReward);

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);

  // 🎬 Video Player Custom Controls State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [earnedNotification, setEarnedNotification] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  useEffect(() => {
    awardWatchTimeRewardRef.current = awardWatchTimeReward;
  }, [awardWatchTimeReward]);

  // 🍿 Watch-to-Earn: Award Coins & XP during active playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const reward = awardWatchTimeRewardRef.current(1);
      setEarnedNotification(`🍿 Watching AniFlix: +${reward.coins} Coins & +${reward.xp} XP!`);
      setTimeout(() => setEarnedNotification(null), 4000);
    }, 45000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Ref for VideoView (needed for fullscreen)
  const videoViewRef = useRef<VideoView>(null);

  // The player receives only a short-lived URL from the secure Edge API.
  const [videoSource, setVideoSource] = useState<any>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    if (Platform.OS !== 'web') {
      p.play();
    }
  });

  useEffect(() => {
    // Keep playbackRate synced
    try {
      player.playbackRate = playbackSpeed;
    } catch {}
  }, [playbackSpeed, player]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);

        if (deletedIds.includes(String(id))) {
          setPlaybackError('This media item has been removed by the administrator.');
          setAnime(null);
          return;
        }

        const defaultMatch = DEFAULT_CATALOG.find((item) => item.id === id);

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
        
        let data = null;
        if (isUuid) {
          const { data: supabaseData } = await supabase
            .from('anime')
            .select('id, title, description, image_url, episodes, genre, category, is_featured, video_asset_key, video_url')
            .eq('id', id)
            .single();
          data = supabaseData;
        }

        if (data) {
          const itemWithOverrides = { ...(data as AnimeItem), ...(overrides[String(id)] || {}) };
          setAnime(itemWithOverrides);
          setPlaybackError(null);
        } else if (defaultMatch) {
          const itemWithOverrides = { ...defaultMatch, ...(overrides[String(id)] || {}) };
          setAnime(itemWithOverrides);
        } else {
          setAnime({
            id: String(id),
            title: `Title #${String(id).slice(0, 6)}`,
            description: 'Experience this thrilling title in full high definition with original audio and multiple subtitle tracks.',
            episodes: 24,
            genre: 'Action, Drama',
            category: 'Movies',
            image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
            is_featured: false,
            ...(overrides[String(id)] || {}),
          });
        }

        let recs = null;
        if (isUuid) {
          const { data: supabaseRecs } = await supabase
            .from('anime')
            .select('id, title, description, image_url, episodes, genre, category, is_featured, video_asset_key, video_url')
            .neq('id', id)
            .limit(6);
          recs = supabaseRecs;
        }

        let finalRecs: AnimeItem[] = [];
        const safeRecs = (recs && recs.length > 0) ? recs : [];

        const customRecs = safeRecs
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => ({ ...(item as AnimeItem), ...(overrides[item.id] || {}) }));
          
        const defaultRecs = DEFAULT_CATALOG
          .filter((item) => !deletedIds.includes(item.id))
          .map((item) => ({ ...item, ...(overrides[item.id] || {}) }));
          
        const localRecs = Object.values(overrides)
          .filter((override: any) => !deletedIds.includes(override.id) && override.id !== id && !safeRecs.some((r: any) => r.id === override.id) && !DEFAULT_CATALOG.some(d => d.id === override.id)) as AnimeItem[];

        finalRecs = [...localRecs, ...customRecs, ...defaultRecs].slice(0, 6);
        setRecommendations(finalRecs);

      } catch (err: any) {
        setPlaybackError('Failed to load anime details. Please try again.');
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (!anime?.id) return;
    let cancelled = false;

    // Check if anime already has a direct HTTP/HTTPS link (e.g. Cloudflare R2 or CDN URL)
    const specificEpisodeUrl = anime.episode_links?.find(e => e.episode === selectedEpisode)?.url?.trim();

    const directUrl =
      (specificEpisodeUrl && specificEpisodeUrl.startsWith('http'))
        ? specificEpisodeUrl
        : (anime.video_url && anime.video_url.trim().startsWith('http'))
        ? anime.video_url.trim()
        : (anime.video_asset_key && anime.video_asset_key.trim().startsWith('http'))
        ? anime.video_asset_key.trim()
        : null;

    console.log('WATCH DEBUG - episode_links:', anime.episode_links);
    console.log('WATCH DEBUG - selectedEpisode:', selectedEpisode);
    console.log('WATCH DEBUG - specificEpisodeUrl:', specificEpisodeUrl);
    console.log('WATCH DEBUG - directUrl:', directUrl);

    if (directUrl) {
      setVideoSource(directUrl);
      setPlaybackError(null);
      return;
    }

    void getPlaybackUrl(anime.id)
      .then(({ url }) => {
        if (!cancelled) {
          setVideoSource(url);
          setPlaybackError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (directUrl) {
            setVideoSource({ uri: directUrl });
            setPlaybackError(null);
          } else {
            setPlaybackError('Secure playback is unavailable for this title.');
          }
        }
      });

    return () => { cancelled = true; };
  }, [anime?.id, anime?.video_url, anime?.video_asset_key, anime?.episode_links, selectedEpisode]);

  const favorited = anime ? isFavorite(anime.id) : false;
  const stats = anime ? getStatsForMedia(anime.id) : { average: 4.8, count: 14 };

  // ⏪ Rewind 10 Seconds
  const handleSeekBackward10 = () => {
    try {
      if (typeof player.seekBy === 'function') {
        player.seekBy(-10);
      } else if (typeof player.currentTime === 'number') {
        player.currentTime = Math.max(0, player.currentTime - 10);
      }
    } catch (e: any) {
      setPlaybackError('Seek operation failed.');
    }
  };

  // ⏩ Fast Forward 10 Seconds
  const handleSeekForward10 = () => {
    try {
      if (typeof player.seekBy === 'function') {
        player.seekBy(10);
      } else if (typeof player.currentTime === 'number') {
        player.currentTime = player.currentTime + 10;
      }
    } catch (e: any) {
      setPlaybackError('Seek operation failed.');
    }
  };

  // ⏯ Play / Pause Toggle
  const handlePlayPause = () => {
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(!isPlaying);
    }
  };

  // 🔄 Aspect Ratio Toggle (16:9 Landscape ↔ 9:16 Vertical Reel)
  const toggleAspectRatio = () => {
    setAspectRatio((prev) => (prev === '16:9' ? '9:16' : '16:9'));
  };

  // ⚡ Change Playback Speed
  const handleSelectSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    try {
      player.playbackRate = speed;
    } catch (e: any) {
      setPlaybackError('Failed to adjust playback speed.');
    }
  };

  // 🔇 Mute / Unmute Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      player.muted = nextMuted;
    } catch (e: any) {
      setPlaybackError('Failed to mute audio.');
    }
  };

  // 🖥️ Enter Fullscreen (Cross-platform)
  const handleFullscreen = async () => {
    try {
      if (videoViewRef.current?.enterFullscreen) {
        await videoViewRef.current.enterFullscreen();
      }
    } catch (e: any) {
      setPlaybackError('Failed to toggle fullscreen.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {/* 🔙 Custom Top Navigation Bar */}
        <View style={[styles.customNav, { backgroundColor: themeColors.backgroundElement }]}>
          <Pressable style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
            <ArrowLeft color={themeColors.text} size={22} />
          </Pressable>
          <Text style={[styles.navTitle, { color: themeColors.text }]} numberOfLines={1}>
            {anime?.title ?? 'AniFlix Cinema'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 🎬 Video Player Container with Dynamic Aspect Ratio (16:9 or 9:16) */}
        <View style={styles.playerWrapper}>
          <View
            style={[
              styles.videoPlayerBox,
              aspectRatio === '9:16' ? styles.videoBoxVertical : styles.videoBoxLandscape,
              (isDesktop || isTablet) && styles.videoPlayerBoxDesktop,
            ]}
          >
            <VideoView
              ref={videoViewRef}
              style={styles.video}
              player={player}
              contentFit={aspectRatio === '9:16' ? 'cover' : 'contain'}
            />
            {playbackError && (
              <View style={styles.videoUnavailable}>
                <Text style={styles.videoUnavailableText}>{playbackError}</Text>
              </View>
            )}

            {/* Floating Aspect Ratio Badge */}
            <View style={styles.ratioBadge}>
              <Text style={styles.ratioBadgeText}>{aspectRatio}</Text>
            </View>

            {/* 🍿 Live Watch-to-Earn Rewards Floating Toast */}
            {earnedNotification && (
              <View style={styles.watchRewardToast}>
                <Sparkles size={14} color="#FFD700" />
                <Text style={styles.watchRewardText}>{earnedNotification}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 🎛️ Cinema Player Controls Bar */}
        <View style={[styles.controlsBar, { backgroundColor: themeColors.backgroundCard }]}>
          {/* ⏪ -10s Rewind */}
          <Pressable style={styles.controlBtn} onPress={handleSeekBackward10}>
            <RotateCcw color={themeColors.text} size={20} />
            <Text style={[styles.controlBtnLabel, { color: themeColors.text }]}>-10s</Text>
          </Pressable>

          {/* ⏯ Play/Pause */}
          <Pressable
            style={[styles.playPauseCircle, { backgroundColor: themeColors.primary, overflow: 'hidden' }]}
            onPress={handlePlayPause}
          >
            <PrimaryGradient borderRadius={32} />
            {isPlaying ? (
              <Pause color="#fff" size={20} fill="#fff" />
            ) : (
              <Play color="#fff" size={20} fill="#fff" />
            )}
          </Pressable>

          {/* ⏩ +10s Forward */}
          <Pressable style={styles.controlBtn} onPress={handleSeekForward10}>
            <RotateCw color={themeColors.text} size={20} />
            <Text style={[styles.controlBtnLabel, { color: themeColors.text }]}>+10s</Text>
          </Pressable>

          {/* 🔄 Aspect Ratio Toggle Button (16:9 ↔ 9:16) */}
          <Pressable style={[styles.controlBtn, styles.aspectToggleBtn]} onPress={toggleAspectRatio}>
            {aspectRatio === '16:9' ? (
              <Smartphone color="#00D2FF" size={20} />
            ) : (
              <Monitor color="#00D2FF" size={20} />
            )}
            <Text style={[styles.controlBtnLabel, { color: '#00D2FF' }]}>
              {aspectRatio === '16:9' ? '9:16 Mode' : '16:9 Mode'}
            </Text>
          </Pressable>

          {/* ⚡ Speed Selector Button */}
          <Pressable
            style={[
              styles.controlBtn,
              styles.speedBtn,
              showSpeedMenu && { backgroundColor: themeColors.backgroundSelected },
            ]}
            onPress={() => setShowSpeedMenu(!showSpeedMenu)}
          >
            <Gauge color="#FFB800" size={18} />
            <Text style={[styles.controlBtnLabel, { color: '#FFB800', fontWeight: '800' }]}>
              {playbackSpeed}x
            </Text>
          </Pressable>

          {/* 🔇 Volume / Mute Toggle */}
          <Pressable style={[styles.controlBtn, styles.volumeBtn]} onPress={handleToggleMute}>
            {isMuted ? (
              <VolumeX color="#ff6666" size={20} />
            ) : (
              <Volume2 color="#4BB543" size={20} />
            )}
            <Text style={[styles.controlBtnLabel, { color: isMuted ? '#ff6666' : '#4BB543' }]}>
              {isMuted ? 'Muted' : 'Sound'}
            </Text>
          </Pressable>

          {/* 🖥️ Fullscreen Button */}
          <Pressable style={[styles.controlBtn, styles.fullscreenBtn]} onPress={handleFullscreen}>
            <Maximize2 color="#B388FF" size={20} />
            <Text style={[styles.controlBtnLabel, { color: '#B388FF' }]}>Fullscreen</Text>
          </Pressable>
        </View>

        {/* 🚀 Playback Speed Options Menu */}
        {showSpeedMenu && (
          <View style={[styles.speedMenu, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.speedMenuTitle, { color: themeColors.textSecondary }]}>
              SELECT PLAYBACK SPEED
            </Text>
            <View style={styles.speedOptionsGrid}>
              {SPEED_OPTIONS.map((speed) => {
                const isCurrent = playbackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    style={[
                      styles.speedOptionChip,
                      isCurrent
                        ? [styles.speedOptionChipActive, { backgroundColor: themeColors.primary }]
                        : { backgroundColor: themeColors.backgroundCard },
                    ]}
                    onPress={() => handleSelectSpeed(speed)}
                  >
                    <Text style={[styles.speedOptionText, { color: isCurrent ? '#fff' : '#9A9AA8' }]}>
                      {speed === 1.0 ? 'Normal (1x)' : `${speed}x`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* DRM / Screen Protection Badge */}
        <View style={styles.drmBanner}>
          <Shield color={themeColors.primary} size={16} />
          <Text style={styles.drmText}>
            AniFlix Protected 4K Stream · Screen Recording & Screenshots Disabled
          </Text>
        </View>

        {/* 📋 Anime Info & Meta */}
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            {anime?.category && (
              <View style={[styles.badge, { backgroundColor: '#7C4DFF' }]}>
                <Text style={styles.badgeText}>{anime.category.toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.badgeText}>
                {`${anime?.episodes ?? 1} EPS`}
              </Text>
            </View>
            <View style={[styles.badgeGlass, { backgroundColor: themeColors.backgroundElement }]}>
              <Text style={[styles.badgeGlassText, { color: themeColors.text }]}>{aspectRatio}</Text>
            </View>
            <View style={[styles.badgeGlass, { backgroundColor: themeColors.backgroundElement }]}>
              <Text style={[styles.badgeGlassText, { color: themeColors.text }]}>{playbackSpeed}X SPEED</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Star color="#FFB800" size={12} fill="#FFB800" />
              <Text style={styles.ratingText}>{stats.average.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={[styles.animeTitle, { color: themeColors.text }]}>
            {language === 'ku' && anime?.title_ku ? anime.title_ku : (anime?.title ?? 'Anime Title')}
          </Text>
          <Text style={[styles.genreText, { color: themeColors.accentCyan }]}>
            {anime?.genre ?? 'Action, Adventure, Fantasy'}
          </Text>
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            {language === 'ku' && anime?.description_ku 
              ? anime.description_ku 
              : (anime?.description || 'Follow the epic journey as new powers awaken and fierce battles decide the fate of both worlds.')}
          </Text>

          {/* ⚡ Quick Actions Row */}
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: favorited ? '#02060E' : themeColors.backgroundElement },
              ]}
              onPress={() => anime && toggleFavorite(anime)}
            >
              <Heart
                color={favorited ? themeColors.primary : themeColors.text}
                fill={favorited ? themeColors.primary : 'none'}
                size={20}
              />
              <Text style={[styles.actionBtnText, { color: favorited ? themeColors.primary : themeColors.text }]}>
                {favorited ? 'In My List' : '+ My List'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 📑 Episodes List Picker */}
        <View style={styles.episodesSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Episodes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.epList}
          >
            {(() => {
              // Determine which episodes to show buttons for
              const availableEpisodes = anime?.episode_links && anime.episode_links.length > 0
                ? anime.episode_links.map(l => l.episode).sort((a, b) => a - b)
                : Array.from({ length: anime?.episodes ?? 1 }).map((_, i) => i + 1);

              return availableEpisodes.map((epNum) => {
                const isActive = epNum === selectedEpisode;
                return (
                  <Pressable
                    key={epNum}
                    style={[
                      styles.epCard,
                      isActive && styles.epCardActive,
                      isActive && { backgroundColor: themeColors.primary }
                    ]}
                    onPress={() => setSelectedEpisode(epNum)}
                  >
                    {isActive && <Play color="#fff" size={14} fill="#fff" />}
                    <Text style={[styles.epCardText, { color: isActive ? '#fff' : themeColors.text }]}>
                      Ep {epNum}
                    </Text>
                  </Pressable>
                );
              });
            })()}
          </ScrollView>
        </View>

        {/* 🌟 More Like This Carousel */}
        {recommendations.length > 0 && (
          <View style={styles.recsSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>You Might Also Like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recList}>
              {recommendations.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.recCard,
                    {
                      backgroundColor: themeColors.backgroundCard,
                      width: railCardWidth,
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/watch', params: { id: item.id } })}
                >
                  <Image
                    source={{
                      uri: item.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
                    }}
                    style={[styles.recThumbnail, { width: railCardWidth, height: railCardHeight }]}
                    resizeMode="cover"
                  />
                  <View style={styles.recInfo}>
                    <Text style={[styles.recTitle, { color: themeColors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.recGenre, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {item.genre ?? 'Anime'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ⭐ Ratings & Community Reviews Section */}
        {anime && (
          <ReviewsSection mediaId={anime.id} mediaTitle={anime.title} />
        )}

        {/* 📢 Google AdMob Banner */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <AdMobBanner placement="watch_bottom" />
        </View>

        <View style={{ height: 60 }} />
      </View>
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
  customNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  playerWrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlayerBox: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerBoxDesktop: {
    maxHeight: 560,
  },
  videoBoxLandscape: {
    aspectRatio: 16 / 9,
  },
  videoBoxVertical: {
    aspectRatio: 9 / 16,
    maxHeight: 520,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoUnavailable: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
  videoUnavailableText: {
    color: '#9A9AA8',
    fontSize: 13,
    fontWeight: '600',
  },
  ratioBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratioBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  watchRewardToast: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 18, 29, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    zIndex: 20,
  },
  watchRewardText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  controlBtnLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  playPauseCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectToggleBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  speedBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
  },
  volumeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(75, 181, 67, 0.4)',
    backgroundColor: 'rgba(75, 181, 67, 0.1)',
  },
  fullscreenBtn: {
    borderWidth: 1,
    borderColor: 'rgba(179, 136, 255, 0.4)',
    backgroundColor: 'rgba(179, 136, 255, 0.1)',
  },
  speedMenu: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
  },
  speedMenuTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  speedOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  speedOptionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242436',
  },
  speedOptionChipActive: {
    borderColor: '#0356C5',
  },
  speedOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  drmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#12121A',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
  },
  drmText: {
    color: '#9A9AA8',
    fontSize: 11,
    fontWeight: '600',
  },
  infoSection: {
    padding: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeGlass: {
    backgroundColor: '#242436',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeGlassText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
  },
  animeTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#242436',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  episodesSection: {
    marginTop: 8,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  epList: {
    paddingHorizontal: 18,
    gap: 10,
  },
  epCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  epCardActive: {
    borderColor: '#0356C5',
  },
  epCardText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  recsSection: {
    marginTop: 16,
  },
  recList: {
    paddingHorizontal: 18,
    gap: 14,
  },
  recCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  recThumbnail: {
    width: '100%',
  },
  recInfo: {
    padding: 8,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  recGenre: {
    fontSize: 11,
    marginTop: 2,
  },
});
