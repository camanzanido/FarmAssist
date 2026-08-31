import { HapticTab } from '@/src/components/ui/haptic-tab';
import { ResearcherColors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { RoleGuard } from '../../src/auth/guards/RoleGuard';

export default function ResearcherLayout() {
  return (
    <RoleGuard allowedRoles={['researcher']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: ResearcherColors.accent,
          tabBarInactiveTintColor: ResearcherColors.textMuted,
          tabBarStyle: {
            backgroundColor: ResearcherColors.tabBg,
            borderTopColor: ResearcherColors.divider,
            height: 83,
            paddingTop: 9,
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
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={23} color={color} />,
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
