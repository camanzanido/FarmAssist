import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';
import { UserType } from '../../src/auth/types';

const ROLES: { type: UserType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'farmer', label: 'Farmer', description: 'Make decisions for your own farm', icon: 'leaf-outline' },
  { type: 'researcher', label: 'Researcher', description: 'Review data & manage users', icon: 'analytics-outline' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type FieldErrors = Partial<Record<
  'name' | 'username' | 'email' | 'password' | 'confirmPassword' | 'city' | 'province',
  string
>>;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [userType, setUserType] = useState<UserType>('farmer');
  const [touched, setTouched] = useState(false);
  const { signUp, isLoading } = useAuth();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  function getFieldErrors(): FieldErrors {
    const errors: FieldErrors = {};

    if (!name.trim()) errors.name = 'Name is required';
    if (!username.trim()) errors.username = 'Username is required';

    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(trimmedEmail)) errors.email = 'Enter a valid email address';

    if (!password) errors.password = 'Password is required';
    else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (!city.trim()) errors.city = 'City/municipality is required';
    if (!province.trim()) errors.province = 'Province is required';

    return errors;
  }

  const errors = getFieldErrors();

  async function handleRegister() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;

    try {
      await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        username: username.trim(),
        user_type: userType,
        city: city.trim(),
        province: province.trim(),
      });
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

      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 24 }}>
        Create Account
      </Text>

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8 }}>
        I am a...
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {ROLES.map((role) => {
          const isSelected = userType === role.type;
          return (
            <TouchableOpacity
              key={role.type}
              onPress={() => setUserType(role.type)}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: isSelected ? '#007AFF' : '#ddd',
                backgroundColor: isSelected ? '#EAF2FF' : '#fff',
                borderRadius: 10,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={role.icon}
                size={22}
                color={isSelected ? '#007AFF' : '#666'}
                style={{ marginBottom: 6 }}
              />
              <Text
                style={{
                  fontWeight: 'bold',
                  color: isSelected ? '#007AFF' : '#333',
                  marginBottom: 2,
                }}
              >
                {role.label}
              </Text>
              <Text style={{ fontSize: 11, color: '#777', textAlign: 'center' }}>
                {role.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1, borderColor: touched && errors.name ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.name ? 4 : 12
        }}
      />
      {touched && errors.name && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.name}</Text>
      )}

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{
          borderWidth: 1, borderColor: touched && errors.username ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.username ? 4 : 12
        }}
      />
      {touched && errors.username && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.username}</Text>
      )}

      <TextInput
        placeholder="City / Municipality"
        value={city}
        onChangeText={setCity}
        style={{
          borderWidth: 1, borderColor: touched && errors.city ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.city ? 4 : 12
        }}
      />
      {touched && errors.city && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.city}</Text>
      )}

      <TextInput
        placeholder="Province"
        value={province}
        onChangeText={setProvince}
        style={{
          borderWidth: 1, borderColor: touched && errors.province ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.province ? 4 : 12
        }}
      />
      {touched && errors.province && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.province}</Text>
      )}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1, borderColor: touched && errors.email ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.email ? 4 : 12
        }}
      />
      {touched && errors.email && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.email}</Text>
      )}

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: touched && errors.password ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.password ? 4 : 12
        }}
      />
      {touched && errors.password && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.password}</Text>
      )}

      <TextInput
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: touched && errors.confirmPassword ? '#D32F2F' : '#ddd',
          borderRadius: 8, padding: 12, marginBottom: touched && errors.confirmPassword ? 4 : 20
        }}
      />
      {touched && errors.confirmPassword && (
        <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 16 }}>{errors.confirmPassword}</Text>
      )}

      <TouchableOpacity
        onPress={handleRegister}
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#99C2FF' : '#007AFF',
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
