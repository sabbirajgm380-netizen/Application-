import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const themeColors = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const ownerEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'esra99san@gmail.com').toLowerCase();

  useEffect(() => {
    const isOwner = user?.email?.toLowerCase() === ownerEmail;
    if (!isLoading && !isOwner) {
      // Non-admin users get redirected away
      router.replace('/(tabs)');
    }
  }, [user, isLoading, ownerEmail, router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.primary,
        },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: themeColors.background },
      }}>
      <Stack.Screen name="index" options={{ title: '⚡ Admin Panel' }} />
      <Stack.Screen name="add-anime" options={{ title: 'Add New Anime', headerBackTitle: 'Panel' }} />
      <Stack.Screen name="edit-anime" options={{ title: 'Edit Media', headerBackTitle: 'Panel' }} />
    </Stack>
  );
}
