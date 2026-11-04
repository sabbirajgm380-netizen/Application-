import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';

export type MediaCategory = 'Movies' | 'Anime Movies' | 'K-Drama' | 'Drama' | 'Anime Series' | 'Short Drama';

export type AnimeItem = {
  id: string;
  title: string;
  image_url: string | null;
  video_url?: string | null;
  video_asset_key?: string | null;
  episodes: number;
  genre: string | null;
  category?: MediaCategory | string;
  is_featured: boolean;
  description?: string | null;
  description_ku?: string | null;
  title_ku?: string | null;
  published_at?: string | null;
  episode_links?: { episode: number; url: string }[];
};

type FavoritesContextType = {
  favorites: AnimeItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (anime: AnimeItem) => Promise<void>;
  isLoading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'user_anime_favorites_v1';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saveLocal = async (items: AnimeItem[]) => {
    try {
      const json = JSON.stringify(items);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, json);
      }
    } catch (err: any) {
      throw new Error(`Failed to save local favorites: ${err.message || err}`);
    }
  };

  // Load favorites from local storage & Supabase
  useEffect(() => {
    async function load() {
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);

        let storedItems: AnimeItem[] = [];
        if (Platform.OS === 'web') {
          const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
          if (raw) storedItems = JSON.parse(raw);
        } else {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) storedItems = JSON.parse(raw);
        }

        const validStored = storedItems
          .filter((item) => !deletedIds.includes(item.id))
          .map((item) => ({ ...item, ...(overrides[item.id] || {}) }));
        setFavorites(validStored);

        // If user is logged in, try fetching from Supabase favorites table
        if (user) {
          const { data, error } = await supabase
            .from('favorites')
            .select('anime_id, anime(id, title, image_url, episodes, genre, is_featured, description)')
            .eq('user_id', user.id);

          if (!error && data && data.length > 0) {
            const remoteAnime = data
              .map((row: any) => row.anime)
              .filter(Boolean)
              .filter((item: any) => !deletedIds.includes(item.id))
              .map((item: any) => ({ ...item, ...(overrides[item.id] || {}) })) as AnimeItem[];
            if (remoteAnime.length > 0) {
              setFavorites(remoteAnime);
              saveLocal(remoteAnime);
            }
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to load favorites: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  const isFavorite = (id: string) => {
    return favorites.some((fav) => String(fav.id) === String(id));
  };

  const toggleFavorite = async (anime: AnimeItem) => {
    const exists = isFavorite(anime.id);
    let updated: AnimeItem[];

    if (exists) {
      updated = favorites.filter((fav) => String(fav.id) !== String(anime.id));
    } else {
      updated = [anime, ...favorites];
    }

    setFavorites(updated);
    await saveLocal(updated);

    // Sync to Supabase in the background if user is authenticated
    if (user) {
      try {
        if (exists) {
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('anime_id', anime.id);
        } else {
          await supabase
            .from('favorites')
            .insert({ user_id: user.id, anime_id: anime.id });
        }
      } catch (err: any) {
        throw new Error(`Failed to sync favorite to cloud: ${err.message || err}`);
      }
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
