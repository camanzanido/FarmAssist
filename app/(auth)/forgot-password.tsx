import { isValidOtp, OTP_LENGTH } from '@/src/auth/otp';
import { sendPasswordResetCode, setPasswordAfterReset, verifyResetCode, type ResetSession } from '@/src/auth/passwordService';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { Colors, inputSurface, inputTextStyle } from '@/src/constants/colors';
import { BUTTON_HEIGHT, contentColumn } from '@/src/constants/layout';
import { forgotPasswordCopy as copy } from '@/src/constants/copy';
import { useSubmitOnce } from '@/src/hooks/use-submit-once';
import { isInternalEmail } from '@/src/utils/accountEmail';
import { getAuthErrorMessage, isExpiredSessionError, isInvalidOtpError } from '@/src/utils/errors';
import { validatePassword, validatePasswordConfirm } from '@/src/utils/passwordValidation';
import { validateEmail } from '@/src/utils/profileValidation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Supabase allows one reset email per address every 60 seconds.
const RESEND_COOLDOWN_S = 60;

type Step = 'email' | 'code' | 'password';

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
  const { isSubmitting: busy, run } = useSubmitOnce();
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [codeFailed, setCodeFailed] = useState(false);
  // Holds the session from the verified code; the new password can only be saved through it.
  const session = useRef<ResetSession | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const emailError = validateEmail(email) ?? (isInternalEmail(email) ? copy.noEmailAccount : null);
  const passwordError = validatePassword(password);
  const confirmError = validatePasswordConfirm(password, confirm);

  const sendCode = async () => {
    setTouched(true);
    setServerError(null);
    if (emailError) return;
    await run(async () => {
      try {
        await sendPasswordResetCode(email);
        setStep('code');
        setTouched(false);
        setCooldown(RESEND_COOLDOWN_S);
      } catch (err) {
        setServerError(getAuthErrorMessage(err, copy.sendFailed));
      }
    });
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setServerError(null);
    await run(async () => {
      try {
        await sendPasswordResetCode(email);
        setCooldown(RESEND_COOLDOWN_S);
        setCode('');
        setCodeFailed(false);
        notify.info(copy.resentTitle, copy.sentBody(email.trim()));
      } catch (err) {
        setServerError(getAuthErrorMessage(err, copy.sendFailed));
      }
    });
  };

  // Checks the code as soon as it is complete, typed or pasted; a wrong code stays in the box so one digit can be fixed.
  const changeCode = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    setCode(digits);
    setCodeFailed(false);
    setServerError(null);
    if (!isValidOtp(digits)) return;
    await run(async () => {
      try {
        session.current = await verifyResetCode(email, digits);
        setTouched(false);
        setStep('password');
      } catch (err) {
        if (isInvalidOtpError(err)) setCodeFailed(true);
        else setServerError(getAuthErrorMessage(err, copy.resetFailed));
      }
    });
  };

  const startOver = () => {
    session.current = null;
    setStep('email');
    setCode('');
    setPassword('');
    setConfirm('');
    setCodeFailed(false);
    setTouched(false);
    setServerError(null);
  };

  const reset = async () => {
    setTouched(true);
    setServerError(null);
    if (passwordError || confirmError) return;
    const verified = session.current;
    if (!verified) {
      setStep('code');
      return;
    }
    await run(async () => {
      try {
        await setPasswordAfterReset(verified, password);
        session.current = null;
        notify.success(copy.doneTitle, copy.doneBody);
        router.back();
      } catch (err) {
        if (isExpiredSessionError(err)) {
          session.current = null;
          setCode('');
          setStep('code');
          setServerError(copy.codeExpired);
        } else {
          setServerError(getAuthErrorMessage(err, copy.resetFailed));
        }
      }
    });
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
          ) : step === 'code' ? (
            <>
              <Text style={s.subtitle}>{copy.sentBody(email.trim())}</Text>
              <Text style={s.label}>{copy.codeLabel}</Text>
              <TextInput
                style={[s.input, s.codeInput, codeFailed && s.inputError]}
                value={code}
                onChangeText={changeCode}
                placeholder="12345678"
                placeholderTextColor={Colors.placeholder}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={OTP_LENGTH}
                editable={!busy}
                autoFocus
              />
              {codeFailed
                ? <Text style={s.errorText}>{copy.codeWrong}</Text>
                : <Text style={s.hintText}>{copy.codeInvalid}</Text>}

              {busy && (
                <View style={s.checkingRow}>
                  <ActivityIndicator color={Colors.accent} />
                  <Text style={s.checkingText}>{copy.checkingCode}</Text>
                </View>
              )}

              <TouchableOpacity onPress={resend} disabled={cooldown > 0 || busy} style={s.resendRow} accessibilityRole="button">
                <Text style={[s.resendText, (cooldown > 0 || busy) && s.resendDisabled]}>
                  {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.subtitle}>{copy.passwordSubtitle}</Text>
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
            </>
          )}

          {serverError && (
            <View style={s.serverError}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={s.serverErrorText}>{serverError}</Text>
            </View>
          )}

          {/* The code step has no button: a complete code is checked as soon as it is entered. */}
          {step !== 'code' && (
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
          )}

          {step !== 'email' && (
            <TouchableOpacity onPress={startOver} disabled={busy} style={[s.footerRow, step === 'code' && s.footerRowSpaced]}>
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
  input: { borderWidth: 1, ...inputSurface, borderRadius: 12, padding: 14, fontSize: 15, ...inputTextStyle },
  codeInput: { fontSize: 22, letterSpacing: 6, fontWeight: '700' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, height: 52 },
  passwordInput: { flex: 1, fontSize: 15, ...inputTextStyle },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },
  hintText: { color: Colors.inkFaint, fontSize: 12, marginTop: 5 },
  checkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  checkingText: { fontSize: 14, fontWeight: '600', color: Colors.inkSoft },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  noteText: { flex: 1, fontSize: 12.5, color: Colors.inkFaint, lineHeight: 17 },

  resendRow: { alignSelf: 'flex-start', marginTop: 14, paddingVertical: 4 },
  resendText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  resendDisabled: { color: Colors.inkFaint },

  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: 12, padding: 12, marginTop: 16 },
  serverErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.danger },

  submitBtn: { backgroundColor: Colors.ink, borderRadius: 12, height: BUTTON_HEIGHT, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },

  footerRow: { alignItems: 'center' },
  footerRowSpaced: { marginTop: 22 },
  footerLink: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
});
