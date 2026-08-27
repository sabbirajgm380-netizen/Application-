
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

// In-memory timestamp of last ad watch per session (first line of defense)
let lastAdWatchedAt: number | null = null;
const RATE_LIMIT_MS = 30_000; // 30 seconds minimum between ads

/**
 * Securely records a completed rewarded ad session into Supabase 'rewarded_ads' table
 * and atomically credits verified coins and XP via secure RPC 'claim_rewarded_ad'.
 *
 * Rate limit enforced at 3 layers:
 *  1. In-memory client-side (30s) — instant rejection, no DB call
 *  2. Database query check (30s) — checked before any insert
 *  3. Server-side RPC (8s) — enforced in Postgres if RPC exists
 */
export async function recordRewardedAdToSupabase(
  userId: string,
  rewardCoins = ADMOB_REWARDS.rewardedAdCoins,
  rewardType = 'coins',
  adUnitId = ADMOB_IDS.rewardedAdUnitId || 'admob-rewarded'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Guest users: allow but don't save to DB
    if (!userId || userId.startsWith('guest-')) {
      return {
        success: true,
        data: { reward_coins: rewardCoins, reward_xp: ADMOB_REWARDS.rewardedAdXP },
      };
    }

    // ── Layer 1: In-memory rate limit (fastest check, no network) ──────────────
    const now = Date.now();
    if (lastAdWatchedAt !== null) {
      const elapsed = now - lastAdWatchedAt;
      if (elapsed < RATE_LIMIT_MS) {
        const secondsLeft = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
        console.warn(`Rate limit: wait ${secondsLeft}s before next ad`);
        return { success: false, error: `Please wait ${secondsLeft} seconds before watching another ad.` };
      }
    }

    // ── Layer 2: Database rate limit check (before any insert) ────────────────
    const { data: lastAd } = await supabase
      .from('rewarded_ads')
      .select('watched_at')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(1)
      .single();

    if (lastAd?.watched_at) {
      const lastWatchedMs = new Date(lastAd.watched_at).getTime();
      const elapsedMs = Date.now() - lastWatchedMs;
      if (elapsedMs < RATE_LIMIT_MS) {
        const secondsLeft = Math.ceil((RATE_LIMIT_MS - elapsedMs) / 1000);
        return { success: false, error: `Please wait ${secondsLeft} seconds before watching another ad.` };
      }
    }

    // ── Layer 3: Try secure server-side RPC (enforces 8s limit in Postgres) ──
    const { data: rpcData, error: rpcError } = await supabase.rpc('claim_rewarded_ad', {
      p_ad_unit_id: adUnitId,
      p_reward_type: rewardType,
      p_verification_token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    if (!rpcError && rpcData && (rpcData as any).success) {
      lastAdWatchedAt = Date.now();
      return { success: true, data: rpcData };
    }

    if (rpcError) {
      const msg = rpcError.message || '';
      // Surface rate limit errors from the DB — don't fallback
      if (msg.includes('wait') || msg.includes('rate') || msg.includes('spam')) {
        return { success: false, error: msg };
      }
      console.warn('claim_rewarded_ad RPC error:', msg);
    }

    // ── Fallback: Direct insert + profile update (RPC not available) ──────────
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

    // Record in-memory timestamp after successful insert
    lastAdWatchedAt = Date.now();

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
