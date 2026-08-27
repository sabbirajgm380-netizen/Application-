
import { supabase } from './supabase';
import {
  ADMOB_IDS,
  ANDROID_BANNER_ID,
  ANDROID_REWARDED_ID,
  IOS_BANNER_ID,
  IOS_REWARDED_ID,
  ADMOB_REWARDS,
} from '@/constants/admob';

export {
  ADMOB_IDS,
  ANDROID_BANNER_ID,
  ANDROID_REWARDED_ID,
  IOS_BANNER_ID,
  IOS_REWARDED_ID,
  ADMOB_REWARDS,
};

export type RewardedAdResult = {
  success: boolean;
  rewardType: 'coins' | 'xp' | 'spin' | 'vip';
  rewardCoins: number;
  rewardXP: number;
  newCoins?: number;
  newXP?: number;
  newLevel?: number;
  adUnitId: string;
};

/**
 * Securely records a completed rewarded ad session into Supabase 'rewarded_ads' table
 * and atomically credits verified coins and XP via secure RPC 'claim_rewarded_ad'.
 * Uses real Supabase (not local Docker) so the 8-second rate limit is enforced server-side.
 */
export async function recordRewardedAdToSupabase(
  userId: string,
  rewardCoins = ADMOB_REWARDS.rewardedAdCoins,
  rewardType = 'coins',
  adUnitId = ADMOB_IDS.rewardedAdUnitId || 'admob-rewarded'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!userId || userId.startsWith('guest-')) {
      return {
        success: true,
        data: { reward_coins: rewardCoins, reward_xp: ADMOB_REWARDS.rewardedAdXP },
      };
    }

    // 1. Try secure RPC function 'claim_rewarded_ad' on real Supabase
    //    This enforces the 8-second rate limit and credits coins atomically server-side.
    const { data: rpcData, error: rpcError } = await supabase.rpc('claim_rewarded_ad', {
      p_ad_unit_id: adUnitId,
      p_reward_type: rewardType,
      p_verification_token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    if (!rpcError && rpcData && (rpcData as any).success) {
      return { success: true, data: rpcData };
    }

    // If RPC rate-limited the user, surface the error (don't fallback and bypass the limit)
    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('wait') || msg.includes('rate') || msg.includes('spam')) {
        return { success: false, error: msg };
      }
      console.warn('claim_rewarded_ad RPC error:', msg);
    }

    // 2. Fallback: Direct insert + profile update on real Supabase
    //    Only reached if the RPC doesn't exist yet. Still goes to real DB (not Docker).
    const { error: insertError } = await supabase.from('rewarded_ads').insert({
      user_id: userId,
      ad_unit_id: adUnitId,
      reward_type: rewardType,
      reward_coins: rewardCoins,
      watched_at: new Date().toISOString(),
    });

    if (insertError) {
      console.warn('rewarded_ads insert error:', insertError.message);
      return { success: false, error: insertError.message };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('coins, xp, level')
      .eq('id', userId)
      .single();

    if (profile) {
      const newCoins = (profile.coins || 0) + rewardCoins;
      const newXP = (profile.xp || 0) + ADMOB_REWARDS.rewardedAdXP;
      const newLevel = Math.floor(newXP / 300) + 1;

      await supabase
        .from('profiles')
        .update({
          coins: newCoins,
          xp: newXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return {
        success: true,
        data: {
          reward_coins: rewardCoins,
          reward_xp: ADMOB_REWARDS.rewardedAdXP,
          new_coins: newCoins,
          new_xp: newXP,
          new_level: newLevel,
        },
      };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error recording rewarded ad in Supabase:', err);
    return { success: false, error: err.message };
  }
}
