import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { DropdownField } from '@/src/components/ui/dropdown-field';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { authCopy as copy } from '@/src/constants/copy';
import { PH_PROVINCES, PH_PROVINCES_TO_CITIES } from '@/src/constants/ph-locations';
import { getAuthErrorMessage } from '@/src/utils/errors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function Field({
  label, value, onChangeText, error, touched, ...rest
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  touched: boolean;
} & Omit<React.ComponentProps<typeof TextInput>, 'style' | 'value' | 'onChangeText'>) {
  const showError = touched && !!error;
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, showError && s.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.placeholder}
        {...rest}
      />
      {showError && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

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
  const { notify } = useFeedback();
  const router = useRouter();

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
  const citiesForProvince = province ? PH_PROVINCES_TO_CITIES[province] ?? [] : [];

  function handleProvinceSelect(nextProvince: string) {
    setProvince(nextProvince);
    setCity('');
  }

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
      notify.error('Registration failed', getAuthErrorMessage(e, 'Something went wrong. Please try again.'));
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.ink} />
          </TouchableOpacity>

          <Text style={s.title}>{copy.registerTitle}</Text>

          <Text style={s.sectionLabel}>{copy.iAm}</Text>
          <View style={s.roleRow}>
            {ROLES.map((role) => {
              const isSelected = userType === role.type;
              return (
                <TouchableOpacity
                  key={role.type}
                  onPress={() => setUserType(role.type)}
                  style={[s.roleCard, isSelected && s.roleCardSelected]}
                  activeOpacity={0.8}
                >
                  <Ionicons name={role.icon} size={22} color={isSelected ? Colors.ink : Colors.inkFaint} style={{ marginBottom: 6 }} />
                  <Text style={[s.roleLabel, isSelected && s.roleLabelSelected]}>{role.label}</Text>
                  <Text style={s.roleDesc}>{role.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label={copy.fullName} value={name} onChangeText={setName} error={errors.name} touched={touched} />
          <Field label={copy.username} value={username} onChangeText={setUsername} error={errors.username} touched={touched} autoCapitalize="none" />
          <DropdownField
            label={copy.provinceLabel}
            value={province}
            options={PH_PROVINCES}
            onSelect={handleProvinceSelect}
            error={errors.province}
            touched={touched}
            placeholder="Select province"
          />
          <DropdownField
            label={copy.cityLabel}
            value={city}
            options={citiesForProvince}
            onSelect={setCity}
            error={errors.city}
            touched={touched}
            placeholder="Select city / municipality"
            disabled={!province}
            disabledHint="Select a province first"
          />
          <Field label={copy.email} value={email} onChangeText={setEmail} error={errors.email} touched={touched} autoCapitalize="none" keyboardType="email-address" />
          <Field label={copy.password} value={password} onChangeText={setPassword} error={errors.password} touched={touched} secureTextEntry />
          <Field label={copy.confirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} touched={touched} secureTextEntry />

          <TouchableOpacity onPress={handleRegister} disabled={isLoading} style={[s.submitBtn, isLoading && s.submitBtnDisabled]} activeOpacity={0.85}>
            <Text style={s.submitBtnText}>{isLoading ? copy.creatingAccount : copy.createAccount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.footerRow}>
            <Text style={s.footerText}>
              {copy.haveAccount} <Text style={s.footerLink}>{copy.signInInstead}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { ...contentColumn, padding: 24, paddingBottom: 40 },
  closeBtn: {
    alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, marginBottom: 22, letterSpacing: -0.4 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: Colors.inkFaint, marginBottom: 9 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleCard: { flex: 1, borderWidth: 1.5, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  roleCardSelected: { borderColor: Colors.ink, backgroundColor: Colors.accentTint },
  roleLabel: { fontWeight: '700', color: Colors.inkSoft, marginBottom: 2 },
  roleLabelSelected: { color: Colors.ink },
  roleDesc: { fontSize: 11, color: Colors.inkFaint, textAlign: 'center' },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.ink },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },

  submitBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },

  footerRow: { alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.inkSoft },
  footerLink: { color: Colors.accent, fontWeight: '700' },
});
