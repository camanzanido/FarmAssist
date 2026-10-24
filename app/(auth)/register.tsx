import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { DropdownField } from '@/src/components/ui/dropdown-field';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { authCopy as copy } from '@/src/constants/copy';
import { PH_PROVINCES, PH_PROVINCES_TO_CITIES } from '@/src/constants/ph-locations';
import { normalizeUsername, validateUsername } from '@/src/utils/accountEmail';
import { getAuthErrorMessage } from '@/src/utils/errors';
import { validateOptionalEmail } from '@/src/utils/newUserValidation';
import { validatePassword, validatePasswordConfirm } from '@/src/utils/passwordValidation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

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
  const [touched, setTouched] = useState(false);
  const { signUp, isLoading } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();

  function getFieldErrors(): FieldErrors {
    const errors: FieldErrors = {};

    if (!name.trim()) errors.name = 'Name is required';
    const usernameError = validateUsername(username);
    if (usernameError) errors.username = usernameError;

    const emailError = validateOptionalEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    const confirmError = validatePasswordConfirm(password, confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;

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
        username: normalizeUsername(username),
        user_type: 'farmer',
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
          <View style={s.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.ink} />
            </TouchableOpacity>
            <Image
              source={require('@/assets/images/FarmAssist-logo.png')}
              style={s.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          <Text style={s.title}>{copy.registerTitle}</Text>
          <Text style={s.subtitle}>{copy.registerSubtitle}</Text>

          <Field label={copy.fullName} value={name} onChangeText={setName} error={errors.name} touched={touched} />
          <Field label={copy.username} value={username} onChangeText={setUsername} error={errors.username} touched={touched} autoCapitalize="none" autoCorrect={false} placeholder={copy.usernamePlaceholder} />
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
          <Field label={copy.emailOptional} value={email} onChangeText={setEmail} error={errors.email} touched={touched} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          {!email.trim() && (
            <View style={s.noteRow}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.inkFaint} />
              <Text style={s.noteText}>{copy.noEmailNote}</Text>
            </View>
          )}
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  logo: { width: 40, height: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, marginBottom: 22, letterSpacing: -0.4 },

  subtitle: { fontSize: 14, color: Colors.inkSoft, lineHeight: 20, marginTop: -12, marginBottom: 22 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.ink },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 14 },
  noteText: { flex: 1, fontSize: 12.5, color: Colors.inkSoft, lineHeight: 17 },

  submitBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },

  footerRow: { alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.inkSoft },
  footerLink: { color: Colors.accent, fontWeight: '700' },
});
