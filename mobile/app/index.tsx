import { Redirect } from 'expo-router';

export default function Index() {
  // The global _layout.tsx handles the actual authentication-based routing,
  // but we need an index file so Expo Router doesn't show "Unmatched Route" on the root URL.
  return <Redirect href="/(auth)/login" />;
}
