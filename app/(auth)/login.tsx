import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading } = useAuth();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  async function handleLogin() {
    try {
      await signIn(email, password);
      // RouteGuard will automatically redirect to (tabs)
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {/* Close Button */}
     <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top > 0 ? insets.top : 16, // Use the inset if it exists
          right: 16,
          zIndex: 10
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333' }}>✕</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 32 }}>
        FarmAssist
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1, borderColor: '#ddd',
          borderRadius: 8, padding: 12, marginBottom: 12
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: '#ddd',
          borderRadius: 8, padding: 12, marginBottom: 20
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        style={{
          backgroundColor: '#007AFF',
          padding: 14, borderRadius: 8, marginBottom: 12
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}