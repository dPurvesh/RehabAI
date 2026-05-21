import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: Colors.bgSecondary, borderTopColor: Colors.border, height: 60, paddingBottom: 8 },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in', tabBarIcon: ({ color }) => <TabIcon icon="✅" color={color} /> }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises', tabBarIcon: ({ color }) => <TabIcon icon="🏋️" color={color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'AI Chat', tabBarIcon: ({ color }) => <TabIcon icon="🤖" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }} />
    </Tabs>
  );
}

import { Text } from 'react-native';
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
