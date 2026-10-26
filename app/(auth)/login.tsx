import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { brandGradientCss, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { authCopy as copy, forgotPasswordCopy } from '@/src/constants/copy';
import { formatLockTime } from '@/src/auth/signInThrottle';
import { useNavLock } from '@/src/hooks/use-nav-lock';
import { useSignInThrottle } from '@/src/hooks/use-sign-in-throttle';
import { useSubmitOnce } from '@/src/hooks/use-submit-once';
import { isEmailLogin } from '@/src/utils/accountEmail';
import { getAuthErrorMessage, isInvalidCredentialsError } from '@/src/utils/errors';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<'login' | 'password', string>>;

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const { signIn } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const nav = useNavLock();
  const throttle = useSignInThrottle();
  const { isSubmitting, run } = useSubmitOnce();

  function getFieldErrors(): FieldErrors {
    const errors: FieldErrors = {};
    const trimmedLogin = login.trim();
    if (!trimmedLogin) errors.login = copy.loginRequired;
    else if (isEmailLogin(trimmedLogin) && !EMAIL_REGEX.test(trimmedLogin)) errors.login = 'Enter a valid email address';

    if (!password) errors.password = 'Password is required';

    return errors;
  }

  const errors = getFieldErrors();

  async function handleLogin() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;

    if (throttle.isLocked) return;

    await run(async () => {
      try {
        await signIn(login.trim(), password);
        throttle.onSuccess();
      } catch (e: any) {
        if (isInvalidCredentialsError(e)) throttle.onFailure();
        notify.error('Login failed', getAuthErrorMessage(e, 'Something went wrong. Please try again.'));
      }
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.ink} />
        </TouchableOpacity>

        <Image
          source={require('@/assets/images/FarmAssist-logo.png')}
          style={s.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={s.brand}>{copy.brand}</Text>
        <Text style={s.subtitle}>{copy.loginSubtitle}</Text>

        <View style={s.field}>
          <Text style={s.label}>{copy.loginLabel}</Text>
          <TextInput
            style={[s.input, touched && errors.login && s.inputError]}
            placeholder={copy.loginPlaceholder}
            placeholderTextColor={Colors.placeholder}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {touched && errors.login && <Text style={s.errorText}>{errors.login}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>{copy.password}</Text>
          <View style={[s.passwordRow, touched && errors.password && s.inputError]}>
            <TextInput
              style={s.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={Colors.placeholder}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.inkFaint} />
            </TouchableOpacity>
          </View>
          {touched && errors.password && <Text style={s.errorText}>{errors.password}</Text>}
          <TouchableOpacity onPress={() => nav.push('/(auth)/forgot-password')} style={s.forgotRow} hitSlop={8} accessibilityRole="link">
            <Text style={s.forgotText}>{forgotPasswordCopy.link}</Text>
          </TouchableOpacity>
        </View>

        <PressableScale
          onPress={handleLogin}
          disabled={isSubmitting || throttle.isLocked}
          style={[s.signInBtn, (isSubmitting || throttle.isLocked) && s.signInBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting || throttle.isLocked, busy: isSubmitting }}
         haptic>
          {isSubmitting && <ActivityIndicator color={Colors.onDark} />}
          <Text style={s.signInBtnText}>
            {throttle.isLocked ? copy.lockedButton(formatLockTime(throttle.lockMs)) : isSubmitting ? copy.signingIn : copy.signIn}
          </Text>
        </PressableScale>
        {throttle.isLocked ? (
          <Text style={s.throttleText}>{copy.lockedMessage}</Text>
        ) : throttle.failures > 0 && throttle.attemptsLeft > 0 && throttle.attemptsLeft <= 2 ? (
          <Text style={s.throttleText}>{copy.attemptsLeft(throttle.attemptsLeft)}</Text>
        ) : null}

        <TouchableOpacity onPress={() => nav.push('/(auth)/register')} style={s.noAccountRow}>
          <Text style={s.noAccountText}>
            {copy.noAccount} <Text style={s.noAccountLink}>{copy.createOne}</Text>
          </Text>
        </TouchableOpacity>
        <Text style={s.researcherNote}>{copy.researcherNote}</Text>

        <View style={s.bottomBlock}>
          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orText}>or</Text>
            <View style={s.orLine} />
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.offlineBtn} activeOpacity={0.8}>
            <Ionicons name="phone-portrait-outline" size={19} color={Colors.ink} />
            <Text style={s.offlineBtnText}>{copy.continueOffline}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { ...contentColumn, flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  closeBtn: {
    alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  logo: { width: 64, height: 64, marginBottom: 20 },
  brand: { fontSize: 32, fontWeight: '800', color: Colors.ink, letterSpacing: -0.6, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.inkSoft, lineHeight: 21, marginBottom: 30 },

  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.inkSoft, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderStrong,
    borderRadius: 14, height: 56, paddingHorizontal: 16, fontSize: 16, color: Colors.ink,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderStrong,
    borderRadius: 14, height: 56, paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, fontSize: 16, color: Colors.ink },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 6 },
  forgotRow: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },

  signInBtn: { experimental_backgroundImage: brandGradientCss(90), borderRadius: 16, height: 60, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 14 },
  signInBtnDisabled: { opacity: 0.6 },
  signInBtnText: { fontSize: 17, fontWeight: '800', color: Colors.onDark },
  throttleText: { fontSize: 13, color: Colors.amberText, textAlign: 'center', marginTop: -4, marginBottom: 14 },

  noAccountRow: { alignItems: 'center' },
  researcherNote: { fontSize: 12.5, color: Colors.inkFaint, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  noAccountText: { fontSize: 15, color: Colors.inkSoft },
  noAccountLink: { color: Colors.accent, fontWeight: '700' },

  bottomBlock: { marginTop: 'auto', marginBottom: 30 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  orText: { fontSize: 12, color: Colors.inkFaint },
  offlineBtn: {
    borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  offlineBtnText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
