import { HapticTab } from '@/src/components/ui/haptic-tab';
import { Colors } from '@/src/constants/colors';
import { useTabBarFrame } from '@/src/constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { RoleGuard } from '../../src/auth/guards/RoleGuard';

export default function ResearcherLayout() {
  const tabBarFrame = useTabBarFrame();

  return (
    <RoleGuard allowedRoles={['researcher']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
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
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'list' : 'list-outline'} size={23} color={color} />,
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
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={23} color={color} />,
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
