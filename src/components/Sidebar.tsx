import { useTranslation } from '@/hooks/use-language';
import { useColorMode, useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import {
    Bookmark,
    Clapperboard,
    Film,
    Gift,
    Home, LayoutGrid,
    Moon,
    Shield,
    Sparkles,
    Sun,
    Tv,
    User,
    X,
    Zap
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRewards?: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenRewards }: SidebarProps) {
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const ownerEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'esra99san@gmail.com').toLowerCase();
  const isOwner = user?.email?.toLowerCase() === ownerEmail;

  const [slideAnim] = useState(new Animated.Value(-300));

  useEffect(() => {
    if (isDesktop) {
      slideAnim.setValue(0);
    } else {
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -300,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [isOpen, isDesktop, slideAnim]);

  const navItems = [
    { label: t('tabHome'), icon: Home, route: '/' },
    { label: t('tabSearch'), icon: LayoutGrid, route: '/search' },
    { label: t('tabFavorites'), icon: Bookmark, route: '/favorites' },
  ];

  const categories = [
    { label: t('catMovies'), icon: Film, route: '/search', params: { category: 'Movies' } },
    { label: t('catAnimeMovies'), icon: Clapperboard, route: '/search', params: { category: 'Anime Movies' } },
    { label: t('catKDrama'), icon: Sparkles, route: '/search', params: { category: 'K-Drama' } },
    { label: t('catDrama'), icon: Tv, route: '/search', params: { category: 'Drama' } },
    { label: t('catAnimeSeries'), icon: Zap, route: '/search', params: { category: 'Anime Series' } },
  ];

  const sidebarWidth = 260;

  const content = (
    <Animated.View
      style={[
        styles.sidebarContent,
        {
          backgroundColor: themeColors.backgroundElement,
          borderRightColor: themeColors.border,
          width: sidebarWidth,
          transform: [{ translateX: isDesktop ? 0 : slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
            <Sparkles color="#fff" size={18} />
          </View>
          <Text style={[styles.brandName, { color: themeColors.text }]}>
            ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
          </Text>
        </View>
        {!isDesktop && (
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X color={themeColors.text} size={24} />
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        style={[styles.navLinks, { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, gap: 8 }}
      >
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>{t('mainMenu')}</Text>
        {navItems.map((item) => {
          // Expo router pathname matching
          const isActive = pathname === item.route || (item.route === '/' && (pathname === '/(tabs)' || pathname === '/(tabs)/index'));
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => {
                router.push(item.route as any);
                if (!isDesktop) onClose();
              }}
              style={[
                styles.navItem,
                isActive && [styles.navItemActive, { backgroundColor: themeColors.primary + '1A' }]
              ]}
            >
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.primary : themeColors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={[styles.adminDivider, { backgroundColor: themeColors.border, marginVertical: 12 }]} />

        <Pressable
          onPress={() => {
            if (onOpenRewards) onOpenRewards();
            if (!isDesktop) onClose();
          }}
          style={styles.navItem}
        >
          <Gift color="#0356C5" size={22} strokeWidth={2} />
          <Text style={[styles.navItemText, { color: '#0356C5', fontWeight: '700' }]}>
            Missions & Spin
          </Text>
        </Pressable>

        <View style={[styles.adminDivider, { backgroundColor: themeColors.border, marginVertical: 12 }]} />
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>{t('categoriesTitle')}</Text>

        {categories.map((item) => {
          const isActive = pathname === item.route && params.category === item.params.category;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.params.category}
              onPress={() => {
                router.push({ pathname: item.route, params: item.params } as any);
                if (!isDesktop) onClose();
              }}
              style={[
                styles.navItem,
                isActive && [styles.navItemActive, { backgroundColor: themeColors.primary + '1A' }]
              ]}
            >
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.primary : themeColors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={[styles.adminDivider, { backgroundColor: themeColors.border, marginVertical: 12, marginTop: 12 }]} />
        <Pressable
          onPress={() => {
            router.push('/profile');
            if (!isDesktop) onClose();
          }}
          style={[
            styles.navItem,
            pathname === '/profile' && [styles.navItemActive, { backgroundColor: themeColors.primary + '1A' }]
          ]}
        >
          <User color={pathname === '/profile' ? themeColors.primary : themeColors.textSecondary} size={22} strokeWidth={pathname === '/profile' ? 2.5 : 2} />
          <Text style={[styles.navItemText, { color: pathname === '/profile' ? themeColors.primary : themeColors.textSecondary }]}>
            {t('tabProfile')}
          </Text>
        </Pressable>

        {isOwner && (
          <Pressable
            onPress={() => {
              router.push('/admin');
              if (!isDesktop) onClose();
            }}
            style={[
              styles.navItem,
              pathname === '/admin' && [styles.navItemActive, { backgroundColor: themeColors.primary + '1A' }]
            ]}
          >
            <Shield color={pathname === '/admin' ? themeColors.primary : themeColors.textSecondary} size={22} strokeWidth={pathname === '/admin' ? 2.5 : 2} />
            <Text style={[styles.navItemText, { color: pathname === '/admin' ? themeColors.primary : themeColors.textSecondary }]}>
              Admin Panel
            </Text>
          </Pressable>
        )}

        <View style={[styles.adminDivider, { backgroundColor: themeColors.border, marginVertical: 12 }]} />
        <View style={[styles.navItem, { justifyContent: 'space-between', paddingVertical: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {isDark ? <Moon color={themeColors.textSecondary} size={22} strokeWidth={2} /> : <Sun color={themeColors.textSecondary} size={22} strokeWidth={2} />}
            <Text style={[styles.navItemText, { color: themeColors.textSecondary }]}>
              {t('darkMode').split(' ')[0] + ' ' + t('darkMode').split(' ')[1]}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleColorMode}
            trackColor={{ false: themeColors.backgroundElement, true: themeColors.primary }}
            thumbColor={'#fff'}
          />
        </View>
      </Animated.ScrollView>
    </Animated.View>
  );

  if (isDesktop) {
    return <View style={{ width: sidebarWidth, height: '100%' }}>{content}</View>;
  }

  // Mobile overlay
  if (!isOpen && (slideAnim as any)._value === -300) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
      {isOpen && (
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </Pressable>
      )}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarContent: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    boxShadow: '4px 0px 10px rgba(0,0,0,0.1)',
    elevation: 5,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  navLinks: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
  },
  navItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adminSection: {
    marginTop: 20,
  },
  adminDivider: {
    height: 1,
    marginBottom: 20,
    opacity: 0.5,
  },
  adminHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 4,
  }
});
