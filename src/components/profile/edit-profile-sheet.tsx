import { useAuth } from '@/src/auth/AuthContext';
import { isValidOtp, OTP_LENGTH } from '@/src/auth/otp';
import { changeUsername, requestEmailChange, saveName, verifyEmailChange } from '@/src/auth/profileService';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { brandGradientCss, Colors, inputSurface, inputTextStyle } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { profileCopy as copy } from '@/src/constants/copy';
import { FunctionError } from '@/src/database/supabase/invokeFunction';
import { useSubmitOnce } from '@/src/hooks/use-submit-once';
import { isInternalEmail, normalizeUsername, realEmail, validateUsername } from '@/src/utils/accountEmail';
import { getActionErrorMessage, getAuthErrorMessage } from '@/src/utils/errors';
import { cleanName, emailChanged, validateEmail, validateName } from '@/src/utils/profileValidation';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type ProfileSaveResult = { pendingEmail: string | null; nameChanged: boolean; emailVerified?: boolean };

type Props = {
  visible: boolean;
  online: boolean;
  pendingEmail?: string | null;
  onClose: () => void;
  onSaved: (result: ProfileSaveResult) => void;
};

const RESEND_COOLDOWN_S = 60;

export function EditProfileSheet({ visible, online, pendingEmail, onClose, onSaved }: Props) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set once a code has gone out; the sheet then asks for it instead of showing the form.
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { isSubmitting: saving, run } = useSubmitOnce();

  useEffect(() => {
    if (!visible || !user) return;
    setName(user.name);
    setUsername(user.username);
    setEmail(realEmail(user.email) ?? '');
    setSubmitted(false);
    setSaveError(null);
    setCode('');
    setCodeFor(online && pendingEmail ? pendingEmail : null);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!user) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const nameError = validateName(name);
  const usernameChanged = online && normalizeUsername(username) !== user.username.toLowerCase();
  const usernameError = usernameChanged ? validateUsername(username) : null;
  const currentEmail = realEmail(user.email);
  // An account without an email can leave the field blank; one with an email must keep a valid one.
  const wantsEmailChange = online && (currentEmail ? emailChanged(currentEmail, email) : email.trim() !== '');
  const emailError = wantsEmailChange
    ? validateEmail(email) ?? (isInternalEmail(email) ? 'Enter a valid email, like juan@example.com.' : null)
    : null;
  const nameChanged = cleanName(name) !== user.name;
  const nothingToSave = !nameChanged && !usernameChanged && !wantsEmailChange;
  const codeError = isValidOtp(code) ? null : copy.codeInvalid;

  const save = async () => {
    setSubmitted(true);
    setSaveError(null);
    if (nameError || usernameError || emailError) return;
    if (nothingToSave) {
      onClose();
      return;
    }
    await run(async () => {
      try {
        if (nameChanged) await saveName(user, name);
        if (usernameChanged) await changeUsername(username);
        if (nameChanged || usernameChanged) await refreshProfile();
        if (!wantsEmailChange) {
          onSaved({ pendingEmail: null, nameChanged });
          return;
        }
        const sentTo = (await requestEmailChange(email)) ?? email.trim();
        setCodeFor(sentTo);
        setCode('');
        setSubmitted(false);
        setCooldown(RESEND_COOLDOWN_S);
      } catch (err) {
        console.error('Failed to update profile:', err);
        setSaveError(err instanceof FunctionError ? err.message : getActionErrorMessage(err, copy.editSaveFailed));
      }
    });
  };

  const verify = async () => {
    if (!codeFor) return;
    setSubmitted(true);
    setSaveError(null);
    if (codeError) return;
    await run(async () => {
      try {
        await verifyEmailChange(codeFor, code);
        await refreshProfile();
        onSaved({ pendingEmail: null, nameChanged, emailVerified: true });
      } catch (err) {
        setSaveError(getAuthErrorMessage(err, copy.codeFailed));
      }
    });
  };

  const resend = async () => {
    if (!codeFor || cooldown > 0) return;
    setSaveError(null);
    await run(async () => {
      try {
        await requestEmailChange(codeFor);
        setCooldown(RESEND_COOLDOWN_S);
      } catch (err) {
        setSaveError(getAuthErrorMessage(err, copy.editSaveFailed));
      }
    });
  };

  if (codeFor) {
    return (
      <BottomSheet visible={visible} onClose={onClose} avoidKeyboard scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
        <Text style={s.title}>{copy.codeTitle}</Text>
        <Text style={s.subtitle}>{copy.codeBody(codeFor)}</Text>

        <Text style={s.label}>{copy.codeLabel}</Text>
        <TextInput
          style={[s.input, s.codeInput, submitted && codeError && s.inputError]}
          value={code}
          onChangeText={setCode}
          editable={!saving}
          placeholder="12345678"
          placeholderTextColor={Colors.placeholder}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          accessibilityLabel={copy.codeLabel}
        />
        {submitted && codeError && <Text style={s.error}>{codeError}</Text>}
        {saveError && <Text style={[s.error, s.saveError]}>{saveError}</Text>}

        <TouchableOpacity onPress={resend} disabled={cooldown > 0 || saving} style={s.linkRow} accessibilityRole="button">
          <Text style={[s.link, (cooldown > 0 || saving) && s.linkDisabled]}>
            {cooldown > 0 ? copy.codeResendIn(cooldown) : copy.codeResend}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCodeFor(null); setSaveError(null); }} disabled={saving} style={s.linkRow} accessibilityRole="button">
          <Text style={s.link}>{copy.codeEditDetails}</Text>
        </TouchableOpacity>

        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => onSaved({ pendingEmail: codeFor, nameChanged })} disabled={saving}>
            <Text style={s.cancelText}>{copy.codeLater}</Text>
          </TouchableOpacity>
          <PressableScale style={[s.saveBtn, saving && s.disabled]} onPress={verify} disabled={saving} haptic>
            {saving ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.saveText}>{copy.codeVerify}</Text>}
          </PressableScale>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>{copy.editTitle}</Text>
      <Text style={s.subtitle}>{copy.editSubtitle}</Text>

      <Text style={s.label}>{copy.nameLabel}</Text>
      <TextInput
        style={[s.input, submitted && nameError && s.inputError]}
        value={name}
        onChangeText={setName}
        placeholder={copy.namePlaceholder}
        placeholderTextColor={Colors.placeholder}
        autoCapitalize="words"
        textContentType="name"
        maxLength={80}
        returnKeyType="next"
      />
      {submitted && nameError && <Text style={s.error}>{nameError}</Text>}

      <Text style={s.label}>{copy.usernameLabel}</Text>
      <TextInput
        style={[s.input, !online && s.inputDisabled, submitted && usernameError && s.inputError]}
        value={username}
        onChangeText={setUsername}
        editable={online}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        maxLength={30}
        returnKeyType="next"
      />
      {submitted && usernameError
        ? <Text style={s.error}>{usernameError}</Text>
        : usernameChanged && <Text style={[s.hint, s.hintAlone]}>{copy.usernameHint}</Text>}

      <Text style={s.label}>{copy.emailLabel}</Text>
      <TextInput
        style={[s.input, !online && s.inputDisabled, submitted && emailError && s.inputError]}
        value={email}
        onChangeText={setEmail}
        editable={online}
        placeholder="juan@example.com"
        placeholderTextColor={Colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="done"
      />
      {submitted && emailError && <Text style={s.error}>{emailError}</Text>}
      {!online ? (
        <View style={s.hintRow}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.inkFaint} />
          <Text style={s.hint}>{copy.emailOfflineHint}</Text>
        </View>
      ) : wantsEmailChange && !emailError ? (
        <View style={s.hintRow}>
          <Ionicons name="mail-outline" size={14} color={Colors.amber} />
          <Text style={[s.hint, { color: Colors.amberText }]}>{copy.emailConfirmHint}</Text>
        </View>
      ) : null}

      {saveError && <Text style={[s.error, s.saveError]}>{saveError}</Text>}

      <View style={s.actions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
          <Text style={s.cancelText}>{copy.editCancel}</Text>
        </TouchableOpacity>
        <PressableScale style={[s.saveBtn, saving && s.disabled]} onPress={save} disabled={saving} haptic>
          {saving ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.saveText}>{copy.editSave}</Text>}
        </PressableScale>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '800', color: Colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: Colors.inkSoft, marginBottom: 8, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: Colors.inkFaint, marginTop: 14, marginBottom: 8 },
  input: {
    height: 50, borderRadius: 12, borderWidth: 1, ...inputSurface,
    paddingHorizontal: 14, fontSize: 15.5, ...inputTextStyle,
  },
  codeInput: { fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  inputDisabled: { backgroundColor: Colors.surfaceAlt, color: Colors.inkFaint },
  inputError: { borderColor: Colors.danger, borderWidth: 1.5 },
  error: { fontSize: 12.5, color: Colors.danger, marginTop: 6 },
  saveError: { marginTop: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  hint: { flex: 1, fontSize: 12.5, color: Colors.inkFaint, lineHeight: 17 },
  hintAlone: { marginTop: 6 },
  linkRow: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', marginTop: 6 },
  link: { fontSize: 13.5, fontWeight: '700', color: Colors.text },
  linkDisabled: { color: Colors.inkFaint },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  saveBtn: { flex: 1.4, height: BUTTON_HEIGHT, borderRadius: 12, experimental_backgroundImage: brandGradientCss(90), alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: Colors.onDark },
  disabled: { opacity: 0.6 },
});
