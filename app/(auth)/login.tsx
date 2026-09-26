import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { Colors } from '@/src/constants/colors';
import { authCopy as copy } from '@/src/constants/copy';
import { getAuthErrorMessage } from '@/src/utils/errors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const { signIn, isLoading } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();

  function getFieldErrors(): FieldErrors {
    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(trimmedEmail)) errors.email = 'Enter a valid email address';

    if (!password) errors.password = 'Password is required';

    return errors;
  }

  const errors = getFieldErrors();

  async function handleLogin() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;

    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      notify.error('Login failed', getAuthErrorMessage(e, 'Something went wrong. Please try again.'));
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      <View style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.onDark} />
        </TouchableOpacity>

        <View style={s.brandIcon}>
          <Ionicons name="leaf" size={28} color={Colors.dark} />
        </View>
        <Text style={s.brand}>{copy.brand}</Text>
        <Text style={s.subtitle}>{copy.loginSubtitle}</Text>

        <View style={s.field}>
          <Text style={s.label}>{copy.email}</Text>
          <TextInput
            style={[s.input, touched && errors.email && s.inputError]}
            placeholder="you@email.com"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {touched && errors.email && <Text style={s.errorText}>{errors.email}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>{copy.password}</Text>
          <View style={[s.passwordRow, touched && errors.password && s.inputError]}>
            <TextInput
              style={s.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.onDarkFaint} />
            </TouchableOpacity>
          </View>
          {touched && errors.password && <Text style={s.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity onPress={handleLogin} disabled={isLoading} style={[s.signInBtn, isLoading && s.signInBtnDisabled]} activeOpacity={0.85}>
          <Text style={s.signInBtnText}>{isLoading ? copy.signingIn : copy.signIn}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.noAccountRow}>
          <Text style={s.noAccountText}>
            {copy.noAccount} <Text style={s.noAccountLink}>{copy.createOne}</Text>
          </Text>
        </TouchableOpacity>

        <View style={s.bottomBlock}>
          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orText}>or</Text>
            <View style={s.orLine} />
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.offlineBtn} activeOpacity={0.8}>
            <Ionicons name="phone-portrait-outline" size={19} color={Colors.onDarkSoft} />
            <Text style={s.offlineBtnText}>{copy.continueOffline}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  closeBtn: {
    alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  brandIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  brand: { fontSize: 32, fontWeight: '800', color: Colors.onDark, letterSpacing: -0.6, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.onDarkFaint, lineHeight: 21, marginBottom: 30 },

  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.onDarkFaint, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, height: 56, paddingHorizontal: 16, fontSize: 16, color: Colors.onDark,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, height: 56, paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, fontSize: 16, color: Colors.onDark },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 6 },

  signInBtn: { backgroundColor: Colors.accentTintStrong, borderRadius: 16, height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 14 },
  signInBtnDisabled: { opacity: 0.6 },
  signInBtnText: { fontSize: 17, fontWeight: '800', color: Colors.dark },

  noAccountRow: { alignItems: 'center' },
  noAccountText: { fontSize: 15, color: Colors.onDarkFaint },
  noAccountLink: { color: Colors.onDark, fontWeight: '700' },

  bottomBlock: { marginTop: 'auto', marginBottom: 30 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  orText: { fontSize: 12, color: Colors.onDarkMuted },
  offlineBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  offlineBtnText: { fontSize: 15, fontWeight: '700', color: Colors.onDarkSoft },
});
