import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { ADMOB_REWARDS } from '@/constants/admob';
import { recordRewardedAdToSupabase } from '@/lib/admob';

type ShowAdOptions = {
  rewardCoins?: number;
  rewardType?: 'coins' | 'xp' | 'spin' | 'vip';
  onRewarded?: (rewardAmount: number) => void;
};

type AdMobContextType = {
  isAdLoaded: boolean;
  isLoadingAd: boolean;
  isAdModalVisible: boolean;
  currentRewardCoins: number;
  currentRewardType: string;
  showRewardedAd: (options?: ShowAdOptions) => Promise<boolean>;
  onAdCompleted: () => Promise<void>;
  closeAdModal: () => void;
};

const AdMobContext = createContext<AdMobContextType | undefined>(undefined);

export function AdMobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdLoaded, setIsAdLoaded] = useState(true);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const [currentRewardCoins, setCurrentRewardCoins] = useState(ADMOB_REWARDS.rewardedAdCoins);
  const [currentRewardType, setCurrentRewardType] = useState<'coins' | 'xp' | 'spin' | 'vip'>('coins');
  const [onRewardCallback, setOnRewardCallback] = useState<((amount: number) => void) | null>(null);

  const showRewardedAd = useCallback(
    async (options?: ShowAdOptions): Promise<boolean> => {
      const coins = options?.rewardCoins ?? ADMOB_REWARDS.rewardedAdCoins;
      const type = options?.rewardType ?? 'coins';

      setCurrentRewardCoins(coins);
      setCurrentRewardType(type);
      if (options?.onRewarded) {
        setOnRewardCallback(() => options.onRewarded);
      } else {
        setOnRewardCallback(null);
      }

      setIsLoadingAd(true);
      // Simulate rapid ad preload
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsLoadingAd(false);
      setIsAdModalVisible(true);
      return true;
    },
    []
  );

  const onAdCompleted = useCallback(async () => {
    const userId = user?.id || 'guest-user';
    
    // Record to Supabase
    const result = await recordRewardedAdToSupabase(userId, currentRewardCoins, currentRewardType);

    if (result.success) {
      // Trigger local callback
      if (onRewardCallback) {
        onRewardCallback(currentRewardCoins);
      }
    } else {
      Alert.alert('Reward Failed', result.error || 'Please wait before claiming another reward.');
    }
  }, [user, currentRewardCoins, currentRewardType, onRewardCallback]);

  const closeAdModal = useCallback(() => {
    setIsAdModalVisible(false);
  }, []);

  return (
    <AdMobContext.Provider
      value={{
        isAdLoaded,
        isLoadingAd,
        isAdModalVisible,
        currentRewardCoins,
        currentRewardType,
        showRewardedAd,
        onAdCompleted,
        closeAdModal,
      }}
    >
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMob() {
  const context = useContext(AdMobContext);
  if (!context) {
    throw new Error('useAdMob must be used within an AdMobProvider');
  }
  return context;
}
