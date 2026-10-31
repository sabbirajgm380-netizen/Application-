import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Flame,
  Zap,
  Gift,
  Sparkles,
  Trophy,
  Check,
  Calendar,
  Award,
  Crown,
  Palette,
  ShieldCheck,
  CheckCircle,
  Film,
  Clock,
  LogOut,
} from 'lucide-react-native';
import { useGamification, SPIN_REWARDS, SpinReward } from '@/hooks/useGamification';
import { useAdMob } from '@/hooks/useAdMob';
import { VipSubscriptionModal } from './VipSubscriptionModal';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/use-language';

interface RewardsHubModalProps {
  visible: boolean;
  onClose: () => void;
}

function EmptyStateView({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

export function RewardsHubModal({ visible, onClose }: RewardsHubModalProps) {
  const themeColors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showRewardedAd } = useAdMob();
  const [showVipModal, setShowVipModal] = useState(false);
  const {
    coins,
    xp,
    level,
    levelTitle,
    nextLevelXP,
    currentLevelBaseXP,
    streakDays,
    hasClaimedDailyStreak,
    canSpinWheel,
    vipDaysRemaining,
    isVIP,
    activeEvent,
    allEvents,
    missions,
    themes,
    activeTheme,
    badges,
    selectSeasonalEvent,
    claimDailyStreak,
    spinWheel,
    claimMission,
    unlockTheme,
    equipTheme,
  } = useGamification();

  const [activeTab, setActiveTab] = useState<
    'missions' | 'spin' | 'streak' | 'events' | 'themes' | 'badges'
  >('missions');
  const [missionFilter, setMissionFilter] = useState<'all' | 'daily' | 'weekly' | 'event'>('all');

  const [spinAnim] = useState(() => new Animated.Value(0));
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);
  const [spinResultVisible, setSpinResultVisible] = useState(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);

  useEffect(() => {
    if (!rewardToast) return;
    const timer = setTimeout(() => setRewardToast(null), 3500);
    return () => clearTimeout(timer);
  }, [rewardToast]);

  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));

  const handleSpinPress = () => {
    if (isSpinning || !canSpinWheel) return;
    setIsSpinning(true);
    setWonReward(null);
    setSpinResultVisible(false);
    setRewardToast(null);

    const targetReward = spinWheel();
    const targetIdx = SPIN_REWARDS.findIndex((r) => r.id === targetReward.id);
    const sliceAngle = 360 / SPIN_REWARDS.length;
    // Each wedge is centred on targetIdx * sliceAngle, with the pointer at the top.
    // Rotate the wheel so that centre lands under the pointer, plus full turns.
    const finalDegree = 360 * 5 + ((360 - targetIdx * sliceAngle) % 360);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: finalDegree,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setIsSpinning(false);
      // Reveal the win result only after the animation has finished.
      setWonReward(targetReward);
      setSpinResultVisible(true);
      setRewardToast(`🎉 You won ${targetReward.label}!`);
    });
  };

  const handleClaimMission = (mission: { id: string; completed: boolean; claimed: boolean; rewardCoins: number; rewardXP: number }) => {
    if (!mission.completed || mission.claimed) return;
    claimMission(mission.id);
    setRewardToast(`Claimed: +${mission.rewardCoins} 💰 · +${mission.rewardXP} ⚡`);
  };

  const handleClaimStreak = () => {
    if (hasClaimedDailyStreak) return;
    const reward = claimDailyStreak();
    if (reward.coins || reward.xp) {
      setRewardToast(`Streak claimed: +${reward.coins} 💰 · +${reward.xp} ⚡`);
    }
  };

  const handleUnlockTheme = (theme: { id: string; name: string }) => {
    const unlocked = unlockTheme(theme.id);
    if (unlocked) {
      setRewardToast(`${theme.name} unlocked!`);
    }
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const filteredMissions = missions.filter((m) => {
    if (missionFilter === 'all') return true;
    return m.category === missionFilter;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.modalCard, { backgroundColor: '#0C0C12' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Trophy size={22} color="#FFB800" />
              <Text style={styles.modalTitle}>{t('rewardsHub', 'AniFlix Rewards & Events Hub')}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#FFF" />
            </Pressable>
          </View>

          {/* User Level, Coins & VIP Status Bar */}
          <View style={styles.userStatusBanner}>
            <View style={styles.statusRow}>
              <View style={styles.levelBadge}>
                <Crown size={14} color="#FFB800" />
                <Text style={styles.levelText}>{t('level')} {level}</Text>
              </View>
              <Text style={styles.levelTitleText} numberOfLines={1} adjustsFontSizeToFit>{t(levelTitle as any, levelTitle)}</Text>

              {isVIP ? (
                <Pressable style={styles.vipBadge} onPress={() => setShowVipModal(true)}>
                  <Text style={styles.vipBadgeText}>👑 VIP ({vipDaysRemaining}d)</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.getVipBtn} onPress={() => setShowVipModal(true)}>
                  <Text style={styles.getVipBtnText}>+ Get VIP</Text>
                </Pressable>
              )}

              <View style={styles.coinBadge}>
                <Text style={styles.coinText}>💰 {coins}</Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
              <Text style={styles.xpSubtext}>
                {levelXPProgress} / {levelXPTarget} {t('xpToLevel')} {level + 1}
              </Text>
            </View>
          </View>

          {/* 📺 AdMob Rewarded Ads Instant Coins Button */}
          <Pressable
            style={styles.admobRewardedBtn}
            onPress={() => showRewardedAd({ rewardCoins: 100, rewardType: 'coins' })}
          >
            <View style={styles.admobBtnLeft}>
              <View style={styles.admobIconCircle}>
                <Film size={16} color="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.admobBtnTitle}>{t('watchAdEarn')}</Text>
                <Text style={styles.admobBtnSub}>{t('watchAdSub')}</Text>
              </View>
            </View>
            <View style={styles.admobRewardPill}>
              <Text style={styles.admobRewardPillText}>+100 💰</Text>
            </View>
          </Pressable>

          {rewardToast && (
            <Pressable style={styles.rewardToast} onPress={() => setRewardToast(null)}>
              <Text style={styles.rewardToastText}>{rewardToast}</Text>
            </Pressable>
          )}

          {/* Navigation Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScrollView}
            contentContainerStyle={styles.tabsRow}
          >
            <Pressable
              style={[styles.tabBtn, activeTab === 'missions' && styles.tabBtnActive]}
              onPress={() => setActiveTab('missions')}
            >
              <Zap size={14} color={activeTab === 'missions' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'missions' && styles.tabBtnTextActive]}
              >
                {t('missions')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'events' && styles.tabBtnActive]}
              onPress={() => setActiveTab('events')}
            >
              <Sparkles size={14} color={activeTab === 'events' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'events' && styles.tabBtnTextActive]}
              >
                {t('events')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'spin' && styles.tabBtnActive]}
              onPress={() => setActiveTab('spin')}
            >
              <Gift size={14} color={activeTab === 'spin' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'spin' && styles.tabBtnTextActive]}
              >
                {t('luckySpin')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'streak' && styles.tabBtnActive]}
              onPress={() => setActiveTab('streak')}
            >
              <Flame size={14} color={activeTab === 'streak' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'streak' && styles.tabBtnTextActive]}
              >
                {t('streak')} ({streakDays}{t('days', 'd')})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'themes' && styles.tabBtnActive]}
              onPress={() => setActiveTab('themes')}
            >
              <Palette size={14} color={activeTab === 'themes' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'themes' && styles.tabBtnTextActive]}
              >
                Theme Shop
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'badges' && styles.tabBtnActive]}
              onPress={() => setActiveTab('badges')}
            >
              <Award size={14} color={activeTab === 'badges' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'badges' && styles.tabBtnTextActive]}
              >
                {t('badges')}
              </Text>
            </Pressable>
          </ScrollView>

          {/* Tab Content */}
          <ScrollView
            style={styles.contentScrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* 🎯 MISSIONS TAB */}
            {activeTab === 'missions' && (
              <View>
                <View style={styles.subfilterRow}>
                  {(['all', 'daily', 'weekly', 'event'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.subfilterChip,
                        missionFilter === cat && styles.subfilterChipActive,
                      ]}
                      onPress={() => setMissionFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.subfilterText,
                          missionFilter === cat && styles.subfilterTextActive,
                        ]}
                      >
                        {t(cat as any, cat).toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {filteredMissions.length === 0 ? (
                  <EmptyStateView title="No missions here" message="Try another filter or check back later for new missions." />
                ) : (
                <View style={styles.missionsList}>
                  {filteredMissions.map((m) => (
                    <View key={m.id} style={styles.missionCard}>
                      <View style={styles.missionHeader}>
                        <View style={styles.missionTitleBox}>
                          <Text style={styles.missionTitle}>{t(m.title as any, m.title)}</Text>
                          <Text style={styles.missionDesc}>{t(m.description as any, m.description)}</Text>
                        </View>
                        <View style={styles.rewardTag}>
                          <Text style={styles.rewardTagText}>
                            +{m.rewardCoins} 💰 · +{m.rewardXP} ⚡
                          </Text>
                        </View>
                      </View>

                      <View style={styles.missionFooter}>
                        <View style={styles.missionProgressBox}>
                          <View style={styles.missionTrack}>
                            <View
                              style={[
                                styles.missionFill,
                                {
                                  width: `${Math.min(100, (m.current / m.target) * 100)}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressCounter}>
                            {m.current} / {m.target}
                          </Text>
                        </View>

                        {m.claimed ? (
                          <View style={styles.claimedBadge}>
                            <Check size={12} color="#00E676" />
                            <Text style={styles.claimedText}>Claimed</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[
                              styles.claimBtn,
                              !m.completed && styles.claimBtnDisabled,
                              m.completed && { backgroundColor: themeColors.primary },
                            ]}
                            disabled={!m.completed}
                            onPress={() => handleClaimMission(m)}
                          >
                            <Text style={styles.claimBtnText}>
                              {m.completed ? t('claimReward') : t('inProgress')}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
                )}
              </View>
            )}

            {/* 🎉 SEASONAL EVENTS SELECTOR TAB */}
            {activeTab === 'events' && (
              <View style={styles.eventsListContainer}>
                <Text style={styles.sectionHeading}>🌟 Seasonal Festival Calendar</Text>
                <Text style={styles.sectionSubtitle}>
                  Choose an active festival to participate in unique quests & earn exclusive badges!
                </Text>

                {allEvents.length === 0 ? (
                  <EmptyStateView title="No events right now" message="Check back later for the next seasonal festival." />
                ) : allEvents.map((evt) => {
                  const isActive = activeEvent.id === evt.id;
                  return (
                    <View
                      key={evt.id}
                      style={[
                        styles.eventCardItem,
                        isActive && { borderColor: evt.themeColor, borderWidth: 1.5 },
                      ]}
                    >
                      <Image source={{ uri: evt.bannerImage }} style={styles.eventCardImage} />
                      <View style={styles.eventCardBody}>
                        <View style={styles.eventMetaRow}>
                          <View
                            style={[
                              styles.eventLiveTag,
                              { backgroundColor: isActive ? '#0356C5' : '#222232' },
                            ]}
                          >
                            <Text style={styles.eventLiveTagText}>
                              {isActive ? '🔥 ACTIVE EVENT' : '📅 UPCOMING EVENT'}
                            </Text>
                          </View>
                          <Text style={[styles.eventBadgeRewardText, { color: evt.themeColor }]}>
                            {evt.badgeIcon} {evt.badgeName}
                          </Text>
                        </View>

                        <Text style={styles.eventCardTitle}>{evt.title}</Text>
                        <Text style={styles.eventCardSubtitle}>{evt.subtitle}</Text>

                        <View style={styles.eventCardFooter}>
                          <Text style={styles.eventMultiplierText}>
                            ⚡ {evt.bonusMultiplier}x Coin & XP Multiplier
                          </Text>
                          <Pressable
                            style={[
                              styles.eventSelectBtn,
                              isActive
                                ? { backgroundColor: '#1E1E2C', borderColor: evt.themeColor }
                                : { backgroundColor: '#0356C5' },
                            ]}
                            onPress={() => selectSeasonalEvent(evt.id)}
                          >
                            <Text style={styles.eventSelectBtnText}>
                              {isActive ? '✓ Selected' : 'Activate Event'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 🎨 THEMES SHOP TAB */}
            {activeTab === 'themes' && (
              <View style={styles.themesContainer}>
                <Text style={styles.sectionHeading}>🎨 AniFlix Cinema Theme Shop</Text>
                <Text style={styles.sectionSubtitle}>
                  Spend your earned AniFlix Coins to unlock and equip custom event themes!
                </Text>

                {themes.length === 0 ? (
                  <EmptyStateView title="No themes available" message="Check back later for new themes in the shop." />
                ) : (
                <View style={styles.themesGrid}>
                  {themes.map((th) => {
                    const isEquipped = activeTheme.id === th.id;
                    const canAfford = coins >= th.costCoins;
                    return (
                      <View key={th.id} style={styles.themeCard}>
                        <View style={[styles.themeColorBar, { backgroundColor: th.primary }]} />
                        <View style={styles.themeContent}>
                          <View style={styles.themeTitleRow}>
                            <Text style={styles.themeName}>{th.name}</Text>
                            {isEquipped && (
                              <View style={styles.equippedBadge}>
                                <CheckCircle size={11} color="#00E676" />
                                <Text style={styles.equippedText}>Equipped</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.themeDesc}>{th.description}</Text>

                          <View style={styles.themeActionRow}>
                            {th.isUnlocked ? (
                              <Pressable
                                style={[
                                  styles.equipBtn,
                                  isEquipped && styles.equipBtnActive,
                                ]}
                                disabled={isEquipped}
                                onPress={() => equipTheme(th.id)}
                              >
                                <Text style={styles.equipBtnText}>
                                  {isEquipped ? 'Active Theme' : 'Equip Theme'}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={[
                                  styles.buyThemeBtn,
                                  !canAfford && styles.buyThemeBtnDisabled,
                                ]}
                                disabled={!canAfford}
                                onPress={() => handleUnlockTheme(th)}
                              >
                                <Text style={styles.buyThemeBtnText}>
                                  Unlock for 💰 {th.costCoins}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
                )}
              </View>
            )}

            {/* 🏅 BADGES TAB */}
            {activeTab === 'badges' && (
              <View style={styles.badgesContainer}>
                <Text style={styles.sectionHeading}>🏅 Achievement Badges</Text>
                <Text style={styles.sectionSubtitle}>
                  Collect prestige badges by watching movies, building streaks, and reviewing!
                </Text>

                {badges.length === 0 ? (
                  <EmptyStateView title="No badges yet" message="Watch, build streaks and review to earn your first badge." />
                ) : (
                <View style={styles.badgesList}>
                  {badges.map((b) => (
                    <View
                      key={b.id}
                      style={[styles.badgeItemCard, !b.isUnlocked && styles.badgeItemLocked]}
                    >
                      <View
                        style={[
                          styles.badgeIconCircle,
                          { backgroundColor: b.isUnlocked ? '#1E1E2C' : '#14141E' },
                        ]}
                      >
                        <Text style={styles.badgeEmoji}>{b.icon}</Text>
                      </View>
                      <View style={styles.badgeInfoBox}>
                        <View style={styles.badgeNameRow}>
                          <Text style={styles.badgeTitle}>{t(b.title as any, b.title)}</Text>
                          {b.isUnlocked ? (
                            <Text style={styles.unlockedDate}>✓ {b.unlockedAt}</Text>
                          ) : (
                            <Text style={styles.lockedTag}>🔒 {t('locked', 'Locked')}</Text>
                          )}
                        </View>
                        <Text style={styles.badgeDesc}>{t(b.description as any, b.description)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                )}
              </View>
            )}

            {/* 🎡 LUCKY SPIN TAB */}
            {activeTab === 'spin' && (
              <View style={styles.spinContainer}>
                <Text style={styles.spinHeaderTitle}>Daily Lucky Cinema Wheel</Text>
                <Text style={styles.spinHeaderSubtitle}>
                  Spin once every day for free Coins, XP, and VIP Passes!
                </Text>

                <View style={styles.wheelWrapper}>
                  <View style={styles.pointerTriangle} />
                  <Animated.View
                    style={[
                      styles.wheelCircle,
                      { transform: [{ rotate: spinRotation }] },
                    ]}
                  >
                    {SPIN_REWARDS.map((r, i) => (
                      <View
                        key={r.id}
                        style={[
                          styles.wheelSegment,
                          { transform: [{ rotate: `${i * (360 / SPIN_REWARDS.length)}deg` }] },
                        ]}
                      >
                        <View style={[styles.wheelWedge, { borderTopColor: r.color }]} />
                        <View style={styles.wheelSegmentLabel}>
                          <Text style={styles.sliceIcon}>{r.icon}</Text>
                          <Text style={styles.sliceLabel} numberOfLines={2}>{r.label}</Text>
                        </View>
                      </View>
                    ))}
                  </Animated.View>
                  <View style={styles.wheelCenterHub}>
                    <Sparkles size={18} color="#FFB800" />
                  </View>
                </View>

                {wonReward && spinResultVisible && (
                  <View style={styles.wonBanner}>
                    <Text style={styles.wonTitle}>🎉 You Won {wonReward.label}!</Text>
                  </View>
                )}

                <Pressable
                  style={[
                    styles.spinActionBtn,
                    (!canSpinWheel || isSpinning) && styles.spinActionBtnDisabled,
                  ]}
                  disabled={!canSpinWheel || isSpinning}
                  onPress={handleSpinPress}
                >
                  <Text style={styles.spinActionBtnText}>
                    {isSpinning
                      ? 'Spinning...'
                      : canSpinWheel
                      ? '🎰 SPIN WHEEL (FREE)'
                      : '✓ Spun Today - Come Back Tomorrow!'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 🔥 DAILY STREAK TAB */}
            {activeTab === 'streak' && (
              <View style={styles.streakContainer}>
                <View style={styles.streakHeroCard}>
                  <Flame size={44} color="#FF5722" />
                  <Text style={styles.streakDaysCount}>{streakDays} DAY STREAK</Text>
                  <Text style={styles.streakSubtitle}>
                    Watch movies & log in daily to build your streak multiplier!
                  </Text>

                  <View style={styles.streakRoadmap}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const isReached = day <= streakDays;
                      const isCurrent = day === streakDays;
                      return (
                        <View key={day} style={styles.streakDayCol}>
                          <View
                            style={[
                              styles.streakDayCircle,
                              isReached && styles.streakDayReached,
                              isCurrent && styles.streakDayCurrent,
                            ]}
                          >
                            {isReached ? (
                              <Flame size={14} color="#FFF" />
                            ) : (
                              <Text style={styles.streakDayNum}>D{day}</Text>
                            )}
                          </View>
                          <Text style={styles.streakDayReward}>+{60 + day * 15}💰</Text>
                        </View>
                      );
                    })}
                  </View>

                  <Pressable
                    style={[
                      styles.claimStreakBtn,
                      hasClaimedDailyStreak && styles.claimStreakBtnClaimed,
                    ]}
                    disabled={hasClaimedDailyStreak}
                    onPress={handleClaimStreak}
                  >
                    <Text style={styles.claimStreakBtnText}>
                      {hasClaimedDailyStreak
                        ? '✓ Today Claimed - Return Tomorrow!'
                        : `Claim Today (+${60 + streakDays * 15} Coins, +${90 + streakDays * 20} XP)`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    height: '90%',
    maxHeight: 740,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  userStatusBanner: {
    backgroundColor: '#12121D',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222234',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#282414',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  levelText: {
    color: '#FFB800',
    fontWeight: '800',
    fontSize: 12,
  },
  levelTitleText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  vipBadge: {
    backgroundColor: '#2D1438',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9C27B0',
    marginRight: 6,
  },
  vipBadgeText: {
    color: '#E1BEE7',
    fontSize: 10,
    fontWeight: '800',
  },
  getVipBtn: {
    backgroundColor: '#1C1C28',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
    marginRight: 6,
  },
  getVipBtnText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
  },
  coinBadge: {
    backgroundColor: '#1C1C28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  coinText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 13,
  },
  xpProgressContainer: {
    gap: 4,
  },
  xpTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  xpSubtext: {
    fontSize: 11,
    color: '#76768E',
    textAlign: 'right',
  },
  admobRewardedBtn: {
    backgroundColor: '#16140D',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3D3418',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  admobBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  admobIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262010',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  admobBtnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  admobBtnSub: {
    fontSize: 10,
    color: '#A0A0B8',
    marginTop: 1,
  },
  admobRewardPill: {
    backgroundColor: '#262010',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  admobRewardPillText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 11,
  },
  rewardToast: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#1E1E2C',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rewardToastText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#13131D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242436',
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#8E8EA4',
    textAlign: 'center',
  },
  tabsScrollView: {
    flexGrow: 0,
    height: 52,
    marginVertical: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#13131C',
    borderWidth: 1,
    borderColor: '#1D1D2C',
  },
  tabBtnActive: {
    backgroundColor: '#0356C5',
    borderColor: '#0356C5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C8CA2',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  contentScrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    flexGrow: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8EA4',
    marginBottom: 16,
  },
  subfilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  subfilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#151520',
  },
  subfilterChipActive: {
    backgroundColor: '#262638',
  },
  subfilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6F6F85',
  },
  subfilterTextActive: {
    color: '#FFF',
  },
  missionsList: {
    gap: 10,
  },
  missionCard: {
    backgroundColor: '#13131D',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202030',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  missionTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 3,
  },
  missionDesc: {
    fontSize: 12,
    color: '#8E8EA4',
  },
  rewardTag: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  rewardTagText: {
    fontSize: 11,
    color: '#FFB800',
    fontWeight: '700',
  },
  missionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  missionProgressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionFill: {
    height: '100%',
    backgroundColor: '#0356C5',
    borderRadius: 3,
  },
  progressCounter: {
    fontSize: 11,
    color: '#707086',
    fontWeight: '600',
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimBtnDisabled: {
    backgroundColor: '#202030',
    borderWidth: 1,
    borderColor: '#3A3A52',
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimedText: {
    fontSize: 12,
    color: '#00E676',
    fontWeight: '700',
  },
  eventsListContainer: {
    gap: 14,
  },
  eventCardItem: {
    backgroundColor: '#13131D',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  eventCardImage: {
    width: '100%',
    height: 120,
  },
  eventCardBody: {
    padding: 14,
  },
  eventMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventLiveTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventLiveTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  eventBadgeRewardText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  eventCardSubtitle: {
    fontSize: 12,
    color: '#A0A0B8',
    marginBottom: 12,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMultiplierText: {
    fontSize: 12,
    color: '#00D2FF',
    fontWeight: '700',
  },
  eventSelectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  eventSelectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  themesContainer: {
    gap: 12,
  },
  themesGrid: {
    gap: 10,
  },
  themeCard: {
    backgroundColor: '#13131D',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
    flexDirection: 'row',
  },
  themeColorBar: {
    width: 8,
  },
  themeContent: {
    flex: 1,
    padding: 14,
  },
  themeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,230,118,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  equippedText: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '700',
  },
  themeDesc: {
    fontSize: 12,
    color: '#8E8EA4',
    marginBottom: 10,
  },
  themeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  equipBtn: {
    backgroundColor: '#262638',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  equipBtnActive: {
    backgroundColor: '#1E1E2C',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  equipBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buyThemeBtn: {
    backgroundColor: '#0356C5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyThemeBtnDisabled: {
    backgroundColor: '#222230',
  },
  buyThemeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  badgesContainer: {
    gap: 10,
  },
  badgesList: {
    gap: 10,
  },
  badgeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131D',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 12,
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeInfoBox: {
    flex: 1,
  },
  badgeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  unlockedDate: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '600',
  },
  lockedTag: {
    fontSize: 10,
    color: '#717188',
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 11,
    color: '#8E8EA4',
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakHeroCard: {
    width: '100%',
    backgroundColor: '#13131D',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  streakDaysCount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#8E8EA4',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  streakRoadmap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  streakDayCol: {
    alignItems: 'center',
    gap: 4,
  },
  streakDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2E42',
  },
  streakDayReached: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  streakDayCurrent: {
    borderColor: '#FFB800',
    borderWidth: 2,
  },
  streakDayNum: {
    fontSize: 11,
    color: '#717188',
    fontWeight: '700',
  },
  streakDayReward: {
    fontSize: 10,
    color: '#FFB800',
    fontWeight: '600',
  },
  claimStreakBtn: {
    width: '100%',
    backgroundColor: '#0356C5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimStreakBtnClaimed: {
    backgroundColor: '#202030',
  },
  claimStreakBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  spinContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  spinHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  spinHeaderSubtitle: {
    fontSize: 12,
    color: '#8E8EA4',
    textAlign: 'center',
    marginBottom: 20,
  },
  wheelWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  pointerTriangle: {
    position: 'absolute',
    top: -12,
    zIndex: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFB800',
  },
  wheelCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E1E2C',
    borderWidth: 4,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wheelSegment: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
  },
  wheelWedge: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 58,
    borderRightWidth: 58,
    borderTopWidth: 100,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  wheelSegmentLabel: {
    position: 'absolute',
    top: 10,
    width: 72,
    alignItems: 'center',
  },
  sliceIcon: {
    fontSize: 20,
  },
  sliceLabel: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  wheelCenterHub: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C0C12',
    borderWidth: 3,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wonBanner: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB800',
    marginVertical: 12,
  },
  wonTitle: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 14,
  },
  spinActionBtn: {
    width: '100%',
    backgroundColor: '#0356C5',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  spinActionBtnDisabled: {
    backgroundColor: '#202030',
  },
  spinActionBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
