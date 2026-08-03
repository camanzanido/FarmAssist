// app/(tabs)/profile.tsx
import { useRouter } from 'expo-router';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';

export default function ProfileScreen() {
  const { user, isResearcher, signOut } = useAuth();
  const router = useRouter();
  const isAuthenticated = !!user;

  async function handleLogout() {
    await signOut();
    Alert.alert('Logged out', 'You have been logged out.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1b8a7e' }}>
      {/* Not Authenticated - Show centered sign in/sign up */}
      {!isAuthenticated ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
              Welcome to FarmAssist
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
              Sign in or create an account to access your profile and more features
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={{
              backgroundColor: 'white',
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 8,
              marginBottom: 12,
              width: '100%',
            }}
          >
            <Text style={{ color: '#1b8a7e', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={{
              backgroundColor: 'transparent',
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: 'white',
              width: '100%',
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Authenticated - Show profile */
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>Profile</Text>
            <TouchableOpacity
              onPress={handleLogout}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 6 }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Log out</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar and User Info */}
          <View style={{ alignItems: 'center', marginBottom: 32, paddingVertical: 20 }}>
            {/* Avatar */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: 'rgba(255,255,255,0.3)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                borderWidth: 3,
                borderColor: 'white',
              }}
            >
              <Text style={{ fontSize: 40, color: 'white' }}>👤</Text>
            </View>

            {/* User Info */}
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
              {user?.name || 'User'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
              {user?.username ? `@${user.username}` : ''}
            </Text>
          </View>

          {/* Account Type */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              Account Type
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: 'white' }}>
              {isResearcher ? 'Researcher' : 'General User'}
            </Text>
          </View>

          {/* Researcher Dashboard Button */}
          {isResearcher && (
            <TouchableOpacity
              onPress={() => router.push('./researcher')}
              style={{
                backgroundColor: 'white',
                paddingVertical: 14,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#1b8a7e', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Go to Researcher Dashboard
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}