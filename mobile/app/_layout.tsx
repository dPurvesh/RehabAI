import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';

function RootLayoutNav() {
  const { session, profile, patientProfile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!patientProfile && !profile?.onboarding_done) {
      if (segments.join('/') !== '(auth)/onboarding') router.replace('/(auth)/onboarding');
    } else {
      if (inAuth) router.replace('/(tabs)/dashboard');
    }
  }, [session, profile, patientProfile, loading]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgPrimary }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgPrimary } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <AuthProvider><RootLayoutNav /></AuthProvider>;
}
