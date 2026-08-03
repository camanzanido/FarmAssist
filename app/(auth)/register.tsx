import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signUp, isLoading } = useAuth();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const canSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0;

  async function handleRegister() {
    try {
      await signUp({ email, password, name, username, user_type: 'farmer' });
      router.back();
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {/* Close Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top > 0 ? insets.top : 16,
          right: 16,
          zIndex: 10
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333' }}>✕</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 32 }}>
        Create Account
      </Text>

      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1, borderColor: '#ddd',
          borderRadius: 8, padding: 12, marginBottom: 12
        }}
      />

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{
          borderWidth: 1, borderColor: '#ddd',
          borderRadius: 8, padding: 12, marginBottom: 12
        }}
      />

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
        onPress={handleRegister}
        disabled={isLoading || !canSubmit}
        style={{
          backgroundColor: isLoading || !canSubmit ? '#99C2FF' : '#007AFF',
          padding: 14, borderRadius: 8, marginBottom: 12
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
}
