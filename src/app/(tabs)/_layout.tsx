import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-language';
import { Home, LayoutGrid, Bookmark, User, Menu } from 'lucide-react-native';
import { Platform, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '@/components/Sidebar';
import { useResponsive } from '@/hooks/useResponsive';
import { useState, createContext, useContext } from 'react';
import { RewardsHubModal } from '@/components/RewardsHubModal';

export const SidebarContext = createContext({
  openSidebar: () => {},
  closeSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function TabLayout() {
  const themeColors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);

  // Dynamically compute tab bar dimensions from device safe area with comfortable mobile clearance
  const bottomInset = Math.max(insets.bottom, 0);
  const tabBarPaddingBottom = Math.max(bottomInset + 4, Platform.OS === 'ios' ? 24 : 14);
  const tabBarHeight = 52 + tabBarPaddingBottom;

  return (
    <SidebarContext.Provider value={{
      openSidebar: () => setIsSidebarOpen(true),
      closeSidebar: () => setIsSidebarOpen(false),
    }}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenRewards={() => setIsRewardsOpen(true)}
      />
      <View style={{ flex: 1 }}>
        <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.backgroundElement,
          borderBottomColor: themeColors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerLeft: () => !isDesktop ? (
          <Pressable onPress={() => setIsSidebarOpen(true)} style={{ paddingHorizontal: 16 }}>
            <Menu color={themeColors.text} size={24} />
          </Pressable>
        ) : null,
        tabBarStyle: {
          display: 'none',
          backgroundColor: themeColors.background,
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0 }),
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome', 'Home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabSearch', 'Browse'),
          headerTitle: t('tabSearch', 'Browse'),
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabFavorites', 'My List'),
          headerTitle: t('tabFavorites', 'My List'),
          tabBarIcon: ({ color, focused }) => (
            <Bookmark color={color} size={22} fill={focused ? color : 'none'} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile', 'Profile'),
          headerTitle: t('tabProfile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      </Tabs>
      </View>
      <RewardsHubModal visible={isRewardsOpen} onClose={() => setIsRewardsOpen(false)} />
    </View>
    </SidebarContext.Provider>
  );
}

