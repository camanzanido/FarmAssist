import { OverviewSkeleton } from '@/src/components/researcher/skeletons';
import { HapticTab } from '@/src/components/ui/haptic-tab';
import { Colors } from '@/src/constants/colors';
import { useTabBarFrame } from '@/src/constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoleGuard } from '../../src/auth/guards/RoleGuard';

export default function ResearcherLayout() {
  const tabBarFrame = useTabBarFrame();

  return (
    <RoleGuard
      allowedRoles={['researcher']}
      fallback={<SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}><OverviewSkeleton /></SafeAreaView>}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          animation: 'shift',
          tabBarButton: HapticTab,
          tabBarActiveTintColor: Colors.ink,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            ...tabBarFrame,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Overview',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="decisions"
          options={{
            title: 'Decisions',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="inputs"
          options={{
            title: 'Inputs',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'options' : 'options-outline'} size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />,
          }}
        />
      </Tabs>
    </RoleGuard>
  );
}
