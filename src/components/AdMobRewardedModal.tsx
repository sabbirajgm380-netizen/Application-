import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import {
  X,
  Sparkles,
  Award,
  CheckCircle2,
  Play,
  Tv,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdMob } from '@/hooks/useAdMob';
import { useGamification } from '@/hooks/useGamification';

const AD_TOTAL_SECONDS = 8;

export function AdMobRewardedModal() {
  const insets = useSafeAreaInsets();
  const {
    isAdModalVisible,
    currentRewardCoins,
    currentRewardType,
    onAdCompleted,
    closeAdModal,
  } = useAdMob();

  const { addXPAndCoins } = useGamification();

  const [secondsRemaining, setSecondsRemaining] = useState(AD_TOTAL_SECONDS);
  const [isCompleted, setIsCompleted] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [progressAnim] = useState(() => new Animated.Value(0));

  // Closing before the timer ends forfeits the reward: credit only happens
  // when the timer reaches zero below, and closing stops that timer.
  const handleCloseWithoutReward = () => {
    closeAdModal();
  };

  useEffect(() => {
    if (!isAdModalVisible) {
      setSecondsRemaining(AD_TOTAL_SECONDS);
      setIsCompleted(false);
      setImageFailed(false);
      progressAnim.setValue(0);
      return;
    }

    // Animate progress bar from 0 to 1 over AD_TOTAL_SECONDS
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_TOTAL_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          // Credit reward
          onAdCompleted();
          addXPAndCoins(100, currentRewardCoins, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAdModalVisible, onAdCompleted, addXPAndCoins, currentRewardCoins, progressAnim]);

  if (!isAdModalVisible) return null;

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={isAdModalVisible} transparent animationType="fade" onRequestClose={handleCloseWithoutReward}>
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.adContainer}>
          {/* Top AdMob Header Bar */}
          <View style={styles.topAdBar}>
            <View style={styles.adBadgeRow}>
              <View style={styles.adLabel}>
                <Text style={styles.adLabelText}>Google AdMob</Text>
              </View>
              <Text style={styles.rewardNotice}>
                Reward: <Text style={styles.rewardNoticeHighlight}>+{currentRewardCoins} 💰</Text>
              </Text>
            </View>

            <View style={styles.topRightControls}>
              {isCompleted ? (
                <Pressable style={styles.closeBtn} onPress={closeAdModal}>
                  <X size={18} color="#FFF" />
                </Pressable>
              ) : (
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownText}>Reward in {secondsRemaining}s</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressPercent }]} />
          </View>

          {/* Video / Creative Showcase */}
          <View style={styles.creativeArea}>
            {imageFailed ? (
              <View style={styles.adImageFallback}>
                <Text style={styles.adImageFallbackText}>Preview image unavailable</Text>
              </View>
            ) : (
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
                }}
                style={styles.adImage}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
              />
            )}
            <View style={styles.adOverlayDark} />

            {/* Ad Content Overlay */}
            <View style={styles.adHeroContent}>
              <View style={styles.sponsorRow}>
                <Tv size={20} color="#00D2FF" />
                <Text style={styles.sponsorName}>AniFlix Ultra HD Sponsor</Text>
              </View>
              <Text style={styles.adHeadline}>
                Stream Next-Gen Anime & Movies in Pure 4K OLED
              </Text>
              <Text style={styles.adSubtext}>
                No buffering. Uncapped bandwidth. Available globally on all devices.
              </Text>
            </View>
          </View>

          {/* Reward Status Bottom Banner */}
          <View style={styles.bottomBanner}>
            {isCompleted ? (
              <View style={styles.rewardSuccessBox}>
                <View style={styles.successLeft}>
                  <CheckCircle2 size={24} color="#00E676" />
                  <View>
                    <Text style={styles.successTitle}>🎉 Reward Granted!</Text>
                    <Text style={styles.successSubtitle}>
                      +{currentRewardCoins} AniFlix Coins added to your account
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.claimButton} onPress={closeAdModal}>
                  <Text style={styles.claimButtonText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.waitingContainer}>
                <View style={styles.waitingBox}>
                  <Sparkles size={18} color="#FFB800" />
                  <Text style={styles.waitingText}>
                    Watch the full ad to receive your <Text style={{ color: '#FFD700', fontWeight: '800' }}>+{currentRewardCoins} Coins</Text>!
                  </Text>
                </View>
                <Pressable style={styles.closeWithoutRewardBtn} onPress={handleCloseWithoutReward}>
                  <Text style={styles.closeWithoutRewardText}>Close without reward — reward will be lost</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  adContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#0B0B12',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
  },
  topAdBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#12121D',
  },
  adBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adLabel: {
    backgroundColor: '#1F1F30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E2E44',
  },
  adLabelText: {
    color: '#A0A0B8',
    fontSize: 11,
    fontWeight: '800',
  },
  rewardNotice: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rewardNoticeHighlight: {
    color: '#FFD700',
    fontWeight: '900',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countdownBox: {
    backgroundColor: '#262010',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  countdownText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#0356C5',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#202030',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E676',
  },
  creativeArea: {
    height: 320,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  adImage: {
    ...StyleSheet.absoluteFill,
  },
  adImageFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#12121D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adImageFallbackText: {
    color: '#8E8EA4',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  adOverlayDark: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 5, 10, 0.55)',
  },
  adHeroContent: {
    padding: 20,
    zIndex: 5,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sponsorName: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adHeadline: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 6,
  },
  adSubtext: {
    color: '#C4C4D8',
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBanner: {
    padding: 16,
    backgroundColor: '#12121D',
    borderTopWidth: 1,
    borderTopColor: '#1F1F30',
  },
  waitingContainer: {
    gap: 8,
    alignItems: 'center',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  waitingText: {
    color: '#A0A0B8',
    fontSize: 13,
    fontWeight: '600',
  },
  closeWithoutRewardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  closeWithoutRewardText: {
    color: '#8E8EA4',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  rewardSuccessBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  successTitle: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '800',
  },
  successSubtitle: {
    color: '#8E8EA4',
    fontSize: 12,
  },
  claimButton: {
    backgroundColor: '#0356C5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  claimButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
