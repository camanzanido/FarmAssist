import { resetPasswordWithCode, sendPasswordResetCode } from '@/src/auth/passwordService';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { forgotPasswordCopy as copy } from '@/src/constants/copy';
import { isInternalEmail } from '@/src/utils/accountEmail';
import { getAuthErrorMessage } from '@/src/utils/errors';
import { validatePassword, validatePasswordConfirm } from '@/src/utils/passwordValidation';
import { validateEmail } from '@/src/utils/profileValidation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Supabase allows one reset email per address every 60 seconds.
const RESEND_COOLDOWN_S = 60;
const CODE_PATTERN = /^\d{6,10}$/;

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { notify } = useFeedback();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const emailError = validateEmail(email) ?? (isInternalEmail(email) ? copy.noEmailAccount : null);
  const codeError = CODE_PATTERN.test(code.trim()) ? null : copy.codeInvalid;
  const passwordError = validatePassword(password);
  const confirmError = validatePasswordConfirm(password, confirm);

  const sendCode = async () => {
    setTouched(true);
    setServerError(null);
    if (emailError) return;
    setBusy(true);
    try {
      await sendPasswordResetCode(email);
      setStep('code');
      setTouched(false);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setServerError(getAuthErrorMessage(err, copy.sendFailed));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setServerError(null);
    setBusy(true);
    try {
      await sendPasswordResetCode(email);
      setCooldown(RESEND_COOLDOWN_S);
      notify.info(copy.resentTitle, copy.sentBody(email.trim()));
    } catch (err) {
      setServerError(getAuthErrorMessage(err, copy.sendFailed));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setTouched(true);
    setServerError(null);
    if (codeError || passwordError || confirmError) return;
    setBusy(true);
    try {
      await resetPasswordWithCode(email, code, password);
      notify.success(copy.doneTitle, copy.doneBody);
      router.back();
    } catch (err) {
      setServerError(getAuthErrorMessage(err, copy.resetFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={Colors.ink} />
          </TouchableOpacity>

          <Text style={s.title}>{copy.title}</Text>

          {step === 'email' ? (
            <>
              <Text style={s.subtitle}>{copy.emailSubtitle}</Text>
              <Text style={s.label}>{copy.emailLabel}</Text>
              <TextInput
                style={[s.input, touched && emailError && s.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!busy}
              />
              {touched && emailError && <Text style={s.errorText}>{emailError}</Text>}
              <View style={s.noteRow}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.inkFaint} />
                <Text style={s.noteText}>{copy.noEmailNote}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={s.subtitle}>{copy.sentBody(email.trim())}</Text>
              <Text style={s.label}>{copy.codeLabel}</Text>
              <TextInput
                style={[s.input, s.codeInput, touched && codeError && s.inputError]}
                value={code}
                onChangeText={v => setCode(v.replace(/\D/g, ''))}
                placeholder="123456"
                placeholderTextColor={Colors.placeholder}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={10}
                editable={!busy}
              />
              {touched && codeError && <Text style={s.errorText}>{codeError}</Text>}

              <Text style={s.label}>{copy.newPasswordLabel}</Text>
              <View style={[s.input, s.passwordRow, touched && passwordError && s.inputError]}>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={Colors.inkFaint} />
                </TouchableOpacity>
              </View>
              {touched && passwordError && <Text style={s.errorText}>{passwordError}</Text>}

              <Text style={s.label}>{copy.confirmLabel}</Text>
              <TextInput
                style={[s.input, touched && confirmError && s.inputError]}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              {touched && confirmError && <Text style={s.errorText}>{confirmError}</Text>}

              <TouchableOpacity onPress={resend} disabled={cooldown > 0 || busy} style={s.resendRow} accessibilityRole="button">
                <Text style={[s.resendText, (cooldown > 0 || busy) && s.resendDisabled]}>
                  {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {serverError && (
            <View style={s.serverError}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={s.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={step === 'email' ? sendCode : reset}
            disabled={busy}
            style={[s.submitBtn, busy && s.submitBtnDisabled]}
            activeOpacity={0.85}
          >
            {busy
              ? <ActivityIndicator color={Colors.onDark} />
              : <Text style={s.submitBtnText}>{step === 'email' ? copy.sendCode : copy.savePassword}</Text>}
          </TouchableOpacity>

          {step === 'code' && (
            <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setServerError(null); }} style={s.footerRow}>
              <Text style={s.footerLink}>{copy.changeEmail}</Text>
            </TouchableOpacity>
          )}
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
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, marginBottom: 10, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Colors.inkSoft, lineHeight: 20, marginBottom: 18 },

  label: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.ink },
  codeInput: { fontSize: 22, letterSpacing: 6, fontWeight: '700' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, height: 52 },
  passwordInput: { flex: 1, fontSize: 15, color: Colors.ink },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  noteText: { flex: 1, fontSize: 12.5, color: Colors.inkFaint, lineHeight: 17 },

  resendRow: { alignSelf: 'flex-start', marginTop: 14, paddingVertical: 4 },
  resendText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  resendDisabled: { color: Colors.inkFaint },

  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: 12, padding: 12, marginTop: 16 },
  serverErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.danger },

  submitBtn: { backgroundColor: Colors.ink, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },

  footerRow: { alignItems: 'center' },
  footerLink: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
});
