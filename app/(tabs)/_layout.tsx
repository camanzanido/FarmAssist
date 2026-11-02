import { useAuth } from '@/src/auth/AuthContext';
import { HapticTab } from '@/src/components/ui/haptic-tab';
import { Colors } from '@/src/constants/colors';
import { useTabBarFrame } from '@/src/constants/layout';
import { useOnboarding } from '@/src/onboarding/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useCopy } from '@/src/i18n/LanguageContext';

export default function TabLayout() {
  const { tabsCopy } = useCopy();
  const { isResearcher } = useAuth();
  const { status: onboarding } = useOnboarding();
  const tabBarFrame = useTabBarFrame();

  // Checked before the researcher redirect so every account sees the intro on first launch.
  if (onboarding === 'loading') return null;
  if (onboarding === 'pending') return <Redirect href="/onboarding" />;
  if (isResearcher) return <Redirect href="/researcher/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.ink,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          ...tabBarFrame,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerShown: false,
        animation: 'shift',
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tabsCopy.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: tabsCopy.history,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tabsCopy.profile,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}