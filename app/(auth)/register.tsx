import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import StepIndicator from '@/src/components/decision/steps-indicator';
import { DropdownField } from '@/src/components/ui/dropdown-field';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { authCopy as copy, termsCopy } from '@/src/constants/copy';
import { PH_PROVINCES, PH_PROVINCES_TO_CITIES } from '@/src/constants/ph-locations';
import { useNavLock } from '@/src/hooks/use-nav-lock';
import { useSubmitOnce } from '@/src/hooks/use-submit-once';
import { normalizeUsername } from '@/src/utils/accountEmail';
import { getAuthErrorMessage } from '@/src/utils/errors';
import { REGISTER_STEPS, validateRegister, validateRegisterStep, type RegisterForm, type RegisterStep, type RegisterTextField } from '@/src/utils/registerValidation';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';

const EMPTY_FORM: RegisterForm = { name: '', province: '', city: '', username: '', email: '', password: '', confirmPassword: '', acceptedTerms: false };

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
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [step, setStep] = useState<RegisterStep>('about');
  const [touched, setTouched] = useState<Record<RegisterStep, boolean>>({ about: false, account: false });
  const { signUp } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const nav = useNavLock();
  const scrollRef = useRef<ScrollView>(null);
  const { isSubmitting, run } = useSubmitOnce();

  const stepIndex = REGISTER_STEPS.indexOf(step);
  const errors = validateRegisterStep(step, form);
  const isTouched = touched[step];
  const citiesForProvince = form.province ? PH_PROVINCES_TO_CITIES[form.province] ?? [] : [];

  const set = (field: RegisterTextField) => (value: string) => setForm(f => ({ ...f, [field]: value }));

  const goToStep = useCallback((next: RegisterStep) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Hardware back on the account step returns to the first step instead of leaving the screen.
  useFocusEffect(useCallback(() => {
    if (step === 'about') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isSubmitting) goToStep('about');
      return true;
    });
    return () => sub.remove();
  }, [step, isSubmitting, goToStep]));

  function handleProvinceSelect(nextProvince: string) {
    setForm(f => ({ ...f, province: nextProvince, city: '' }));
  }

  function handleNext() {
    setTouched(t => ({ ...t, about: true }));
    if (Object.keys(errors).length > 0) return;
    goToStep('account');
  }

  async function handleRegister() {
    setTouched({ about: true, account: true });
    if (Object.keys(validateRegister(form)).length > 0) {
      if (Object.keys(validateRegisterStep('about', form)).length > 0) goToStep('about');
      return;
    }

    await run(async () => {
      try {
        await signUp({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          username: normalizeUsername(form.username),
          user_type: 'farmer',
          city: form.city.trim(),
          province: form.province.trim(),
        });
        router.back();
      } catch (e: any) {
        notify.error('Registration failed', getAuthErrorMessage(e, 'Something went wrong. Please try again.'));
      }
    });
  }

  function handleClose() {
    if (step === 'account') goToStep('about');
    else router.back();
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={s.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={step === 'account' ? copy.back : copy.close}
            >
              <Ionicons name={step === 'account' ? 'arrow-back' : 'close'} size={22} color={Colors.ink} />
            </TouchableOpacity>
            <StepIndicator current={stepIndex} total={REGISTER_STEPS.length} />
          </View>

          <Text style={s.title}>{step === 'about' ? copy.registerTitle : copy.registerAccountTitle}</Text>
          <Text style={s.subtitle}>{step === 'about' ? copy.registerSubtitle : copy.registerAccountSubtitle}</Text>

          <Text style={s.sectionTitle} accessibilityRole="header">
            {step === 'about' ? copy.sectionPersonal : copy.sectionAccount}
          </Text>

          {step === 'about' ? (
            <>
              <Field label={copy.fullName} value={form.name} onChangeText={set('name')} error={errors.name} touched={isTouched} textContentType="name" autoComplete="name" />
              <DropdownField
                label={copy.provinceLabel}
                value={form.province}
                options={PH_PROVINCES}
                onSelect={handleProvinceSelect}
                error={errors.province}
                touched={isTouched}
                placeholder="Select province"
              />
              <DropdownField
                label={copy.cityLabel}
                value={form.city}
                options={citiesForProvince}
                onSelect={set('city')}
                error={errors.city}
                touched={isTouched}
                placeholder="Select city / municipality"
                disabled={!form.province}
                disabledHint="Select a province first"
              />

              <PressableScale onPress={handleNext} style={s.submitBtn} accessibilityRole="button" haptic>
                <Text style={s.submitBtnText}>{copy.next}</Text>
              </PressableScale>
            </>
          ) : (
            <>
              <Field label={copy.username} value={form.username} onChangeText={set('username')} error={errors.username} touched={isTouched} autoCapitalize="none" autoCorrect={false} placeholder={copy.usernamePlaceholder} editable={!isSubmitting} />
              <Field label={copy.emailOptional} value={form.email} onChangeText={set('email')} error={errors.email} touched={isTouched} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!isSubmitting} />
              {!form.email.trim() && (
                <View style={s.noteRow}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.inkFaint} />
                  <Text style={s.noteText}>{copy.noEmailNote}</Text>
                </View>
              )}
              <Field label={copy.password} value={form.password} onChangeText={set('password')} error={errors.password} touched={isTouched} secureTextEntry editable={!isSubmitting} />
              <Field label={copy.confirmPassword} value={form.confirmPassword} onChangeText={set('confirmPassword')} error={errors.confirmPassword} touched={isTouched} secureTextEntry editable={!isSubmitting} />

              <View style={s.termsRow}>
                <TouchableOpacity
                  onPress={() => setForm(f => ({ ...f, acceptedTerms: !f.acceptedTerms }))}
                  disabled={isSubmitting}
                  style={[s.checkbox, form.acceptedTerms && s.checkboxOn, isTouched && !!errors.acceptedTerms && s.checkboxError]}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.acceptedTerms }}
                  accessibilityLabel={`${termsCopy.agreeLabel} ${termsCopy.agreeLink}`}
                >
                  {form.acceptedTerms && <Ionicons name="checkmark" size={16} color={Colors.onDark} />}
                </TouchableOpacity>
                <Text style={s.termsText}>
                  {termsCopy.agreeLabel}{' '}
                  <Text style={s.termsLink} onPress={() => nav.push('/terms')} accessibilityRole="link">{termsCopy.agreeLink}</Text>
                </Text>
              </View>
              {isTouched && errors.acceptedTerms && <Text style={[s.errorText, s.termsError]}>{errors.acceptedTerms}</Text>}

              <PressableScale
                onPress={handleRegister}
                disabled={isSubmitting}
                style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
               haptic>
                {isSubmitting && <ActivityIndicator color={Colors.onDark} />}
                <Text style={s.submitBtnText}>{isSubmitting ? copy.creatingAccount : copy.createAccount}</Text>
              </PressableScale>
            </>
          )}

          {/* dismissTo returns to an open sign-in screen instead of stacking another one on top. */}
          <TouchableOpacity onPress={() => router.dismissTo('/(auth)/login')} disabled={isSubmitting} style={s.footerRow}>
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
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, marginBottom: 22, letterSpacing: -0.4 },

  subtitle: { fontSize: 14, color: Colors.inkSoft, lineHeight: 20, marginTop: -12, marginBottom: 22 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: Colors.inkFaint, textTransform: 'uppercase', marginBottom: 12 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.ink },
  inputError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 14 },
  noteText: { flex: 1, fontSize: 12.5, color: Colors.inkSoft, lineHeight: 17 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  checkboxError: { borderColor: Colors.danger },
  termsText: { flex: 1, fontSize: 14, color: Colors.inkSoft, lineHeight: 20 },
  termsLink: { color: Colors.ink, fontWeight: '700', textDecorationLine: 'underline' },
  termsError: { marginTop: 4, marginBottom: 4 },

  submitBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },

  footerRow: { alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.inkSoft },
  footerLink: { color: Colors.accent, fontWeight: '700' },
});
