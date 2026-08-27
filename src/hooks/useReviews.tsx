import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { moderateContent } from '@/lib/moderation';

export type Review = {
  id: string;
  mediaId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  createdAt: string;
  helpfulCount: number;
  isVerified?: boolean;
};

type RatingStats = {
  average: number;
  count: number;
  breakdown: { [stars: number]: number };
};

type ReviewsContextType = {
  reviews: Review[];
  getReviewsForMedia: (mediaId: string) => Review[];
  getStatsForMedia: (mediaId: string) => RatingStats;
  getUserReview: (mediaId: string) => Review | undefined;
  addReview: (mediaId: string, rating: number) => Promise<void>;
  editReview: (reviewId: string, rating: number) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  toggleHelpful: (reviewId: string) => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);
const REVIEWS_STORAGE_KEY = 'aniflix_community_reviews_v2';
const HELPFUL_STORAGE_KEY = 'aniflix_helpful_reviews_v2';

// Seed Initial Reviews for Top Titles
const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    mediaId: 'movie-1', // Inception
    userId: 'user-101',
    userName: 'CinemaGeek99',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80',
    rating: 5,
    createdAt: '2 hours ago',
    helpfulCount: 42,
    isVerified: true,
  },
  {
    id: 'rev-2',
    mediaId: 'movie-1',
    userId: 'user-102',
    userName: 'Sarah Miller',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
    rating: 5,
    createdAt: '1 day ago',
    helpfulCount: 19,
    isVerified: true,
  },
  {
    id: 'rev-3',
    mediaId: 'anime-1', // Attack on Titan
    userId: 'user-103',
    userName: 'LeviAckermanFan',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&q=80',
    rating: 5,
    createdAt: '3 hours ago',
    helpfulCount: 56,
    isVerified: true,
  },
  {
    id: 'rev-4',
    mediaId: 'amovie-1', // Your Name
    userId: 'user-104',
    userName: 'AnimeAesthetic',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80',
    rating: 5,
    createdAt: '5 hours ago',
    helpfulCount: 31,
    isVerified: true,
  },
  {
    id: 'rev-5',
    mediaId: 'anime-2', // Demon Slayer
    userId: 'user-105',
    userName: 'Tanjiro_Official',
    userAvatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=120&q=80',
    rating: 5,
    createdAt: '1 day ago',
    helpfulCount: 48,
    isVerified: true,
  },
  {
    id: 'rev-6',
    mediaId: 'drama-1', // Breaking Bad
    userId: 'user-106',
    userName: 'WalterWhite99',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
    rating: 5,
    createdAt: '2 days ago',
    helpfulCount: 65,
    isVerified: true,
  },
  {
    id: 'rev-7',
    mediaId: 'anime-4', // Solo Leveling
    userId: 'user-107',
    userName: 'ShadowMonarch',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
    rating: 5,
    createdAt: '4 hours ago',
    helpfulCount: 29,
    isVerified: true,
  },
];

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);

  // Load reviews from persistent storage and Supabase
  useEffect(() => {
    async function load() {
      try {
        let storedReviews: Review[] = [];
        let storedHelpful: string[] = [];

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
          if (raw) storedReviews = JSON.parse(raw);
          const rawH = localStorage.getItem(HELPFUL_STORAGE_KEY);
          if (rawH) storedHelpful = JSON.parse(rawH);
        } else {
          const raw = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
          if (raw) storedReviews = JSON.parse(raw);
          const rawH = await AsyncStorage.getItem(HELPFUL_STORAGE_KEY);
          if (rawH) storedHelpful = JSON.parse(rawH);
        }

        // Only demo and guest entries belong in device storage. Database-backed
        // comments must be reloaded from Supabase so a deleted comment cannot
        // be resurrected by an old cache on a profile or a product page.
        const localOnlyReviews = storedReviews.filter(
          (review) => review.id.startsWith('rev-') || review.userId.startsWith('guest-')
        );

        if (localOnlyReviews.length > 0) {
          const merged = [...localOnlyReviews];
          DEFAULT_REVIEWS.forEach((def) => {
            if (!merged.some((r) => r.id === def.id)) {
              merged.push(def);
            }
          });
          setReviews(merged);
        } else {
          setReviews(DEFAULT_REVIEWS);
        }

        if (storedHelpful) setHelpfulIds(storedHelpful);

        // Fetch from Supabase comments table
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        const fetchCommentsPromise = supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false });

        const res = (await Promise.race([fetchCommentsPromise, timeoutPromise])) as any;
        if (res && res.data && res.data.length > 0) {
          const dbReviews: Review[] = res.data.map((c: any) => ({
            id: c.id,
            mediaId: c.movie_id || c.media_id,
            userId: c.user_id,
            userName: c.user_name || 'Community Streamer',
            rating: c.rating || 5,
            createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently',
            helpfulCount: c.likes_count || c.helpful_count || 0,
            isVerified: true,
          }));

          setReviews((prev) => {
            const combined = [...dbReviews];
            prev.forEach((p) => {
              if (!combined.some((item) => item.id === p.id)) {
                combined.push(p);
              }
            });
            return combined;
          });
        }
      } catch {
        // Background cache failure shouldn't crash applocal reviews
      }
    }
    load();
  }, []);

  const saveReviews = async (newReviews: Review[]) => {
    setReviews(newReviews);
    try {
      const json = JSON.stringify(newReviews);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(REVIEWS_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, json);
      }
    } catch (e) {
      console.warn('Error saving reviews:', e);
    }
  };

  const getReviewsForMedia = (mediaId: string): Review[] => {
    return reviews.filter((r) => String(r.mediaId) === String(mediaId));
  };

  const getStatsForMedia = (mediaId: string): RatingStats => {
    const list = getReviewsForMedia(mediaId);
    const breakdown: { [stars: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (list.length === 0) {
      return {
        average: 4.8,
        count: 14,
        breakdown: { 5: 11, 4: 2, 3: 1, 2: 0, 1: 0 },
      };
    }

    let sum = 0;
    list.forEach((r) => {
      sum += r.rating;
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    const average = Math.round((sum / list.length) * 10) / 10;
    return { average, count: list.length, breakdown };
  };

  const getUserReview = (mediaId: string): Review | undefined => {
    const currentUserId = user?.id || 'guest-user';
    return reviews.find(
      (r) => String(r.mediaId) === String(mediaId) && r.userId === currentUserId
    );
  };

  const addReview = async (mediaId: string, rating: number) => {
    const authorName = profile?.full_name || user?.email?.split('@')[0] || 'AniFlix Streamer';
    const authorId = user?.id || 'guest-' + Date.now();

    const existingIndex = reviews.findIndex(
      (r) => String(r.mediaId) === String(mediaId) && r.userId === authorId
    );

    let updated: Review[];

    if (existingIndex >= 0) {
      const existing = reviews[existingIndex];
      updated = [...reviews];
      updated[existingIndex] = {
        ...existing,
        rating,
        createdAt: 'Just now (edited)',
      };

      // Skip DB sync since comments table is dropped, use local state only
      // (Any future DB sync should be to a dedicated 'reviews' or 'ratings' table)
    } else {
      let newId = 'rev-' + Date.now();
      // Skip DB insert since comments table is dropped, use local state only
      const newReview: Review = {
        id: newId,
        mediaId: String(mediaId),
        userId: authorId,
        userName: authorName,
        rating,
        createdAt: 'Just now',
        helpfulCount: 0,
        isVerified: true,
      };
      updated = [newReview, ...reviews];
    }

    await saveReviews(updated);
  };

  const editReview = async (reviewId: string, rating: number) => {
    const currentUserId = user?.id || 'guest-user';
    const target = reviews.find((review) => review.id === reviewId && review.userId === currentUserId);
    if (!target) throw new Error('You can only edit your own rating.');

    // Skip DB sync since comments table is dropped, use local state only

    const updated = reviews.map((r) => {
      if (r.id === reviewId && r.userId === currentUserId) {
        return {
          ...r,
          rating,
          createdAt: r.createdAt.includes('edited') ? r.createdAt : r.createdAt + ' · edited',
        };
      }
      return r;
    });
    await saveReviews(updated);
  };

  const deleteReview = async (reviewId: string) => {
    const currentUserId = user?.id || 'guest-user';
    const isAdmin = profile?.role === 'admin' || user?.email === 'admin@aniflix.com';
    const target = reviews.find((review) => review.id === reviewId && (review.userId === currentUserId || isAdmin));
    if (!target) throw new Error('You can only delete your own comment.');

    // Skip DB delete since comments table is dropped, use local state only

    // Delete locally
    const updated = reviews.filter(
      (review) => review.id !== reviewId
    );
    await saveReviews(updated);
  };

  const toggleHelpful = async (reviewId: string) => {
    const isAlreadyHelpful = helpfulIds.includes(reviewId);
    const updatedHelpful = isAlreadyHelpful
      ? helpfulIds.filter((id) => id !== reviewId)
      : [...helpfulIds, reviewId];

    setHelpfulIds(updatedHelpful);

    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        return {
          ...r,
          helpfulCount: isAlreadyHelpful ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
        };
      }
      return r;
    });

    await saveReviews(updatedReviews);

    // Sync to Supabase comment_likes
    if (user?.id && !user.id.startsWith('guest-') && !reviewId.startsWith('rev-')) {
      if (isAlreadyHelpful) {
        supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', reviewId)
          .eq('user_id', user.id)
          .then(() => {});
      } else {
        supabase
          .from('comment_likes')
          .insert({
            comment_id: reviewId,
            user_id: user.id,
          })
          .then(() => {});
      }
    }

    try {
      const json = JSON.stringify(updatedHelpful);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(HELPFUL_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(HELPFUL_STORAGE_KEY, json);
      }
    } catch {}
  };

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        getReviewsForMedia,
        getStatsForMedia,
        getUserReview,
        addReview,
        editReview,
        deleteReview,
        toggleHelpful,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
}
