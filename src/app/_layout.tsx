import { AdMobRewardedModal } from '@/components/AdMobRewardedModal';
import { AniFlixSplashScreen } from '@/components/AniFlixSplashScreen';
import { AppThemeProvider, useColorMode, useTheme } from '@/hooks/use-theme';
import { AdMobProvider } from '@/hooks/useAdMob';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { FavoritesProvider } from '@/hooks/useFavorites';
import { GamificationProvider } from '@/hooks/useGamification';
import { ReviewsProvider } from '@/hooks/useReviews';
import { SocialProvider } from '@/hooks/useSocial';
import { Stack, useLocalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { LanguageProvider } from '@/hooks/use-language';

SplashScreen.preventAutoHideAsync().catch(() => {});

function PrivacyProtection() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;

    const isAdmin = user?.email?.toLowerCase() === 'esra99san@gmail.com';

    if (isAdmin) {
      void ScreenCapture.allowScreenCaptureAsync('app-security');
    } else {
      void ScreenCapture.preventScreenCaptureAsync('app-security');
      if (Platform.OS === 'ios') {
        // @ts-ignore
        if (ScreenCapture.enableAppSwitcherProtectionAsync) void ScreenCapture.enableAppSwitcherProtectionAsync(1);
      }
    }
  }, [user, isLoading]);

  return null;
}

function AuthGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const router = useRouter();

  useEffect(() => {
    // Hide native splash screen as our animated splash takes over
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPasswordRecovery = String(segments[0]) === 'reset-password';

    if (!session && !inAuthGroup && !isPasswordRecovery) {
      router.replace({ pathname: '/(auth)/login', params: { redirect: pathname } });
    } else if (session && inAuthGroup && redirect !== '/adminpanel') {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, pathname, redirect, router]);

  return null;
}

function RootNavigation({
  showSplash,
  onFinishSplash,
}: {
  showSplash: boolean;
  onFinishSplash: () => void;
}) {
  const themeColors = useTheme();
  const { isDark } = useColorMode();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AuthGuard />
      <PrivacyProtection />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColors.backgroundElement,
          },
          headerTintColor: themeColors.text,
          contentStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="adminpanel" options={{ headerShown: false }} />
        <Stack.Screen name="watch" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="verified" options={{ headerShown: false }} />
        <Stack.Screen name="fib-payment" options={{ headerShown: false }} />
      </Stack>

      {/* Google AdMob Rewarded Ad Modal */}
      <AdMobRewardedModal />

      {showSplash && <AniFlixSplashScreen onFinish={onFinishSplash} />}
    </View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ReviewsProvider>
          <GamificationProvider>
            <AppThemeProvider>
              <LanguageProvider>
                <SocialProvider>
                  <AdMobProvider>
                    <RootNavigation showSplash={showSplash} onFinishSplash={() => setShowSplash(false)} />
                  </AdMobProvider>
                </SocialProvider>
              </LanguageProvider>
            </AppThemeProvider>
          </GamificationProvider>
        </ReviewsProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
