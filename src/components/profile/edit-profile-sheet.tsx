import { useAuth } from '@/src/auth/AuthContext';
import { requestEmailChange, saveName } from '@/src/auth/profileService';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { brandGradientCss, Colors } from '@/src/constants/colors';
import { profileCopy as copy } from '@/src/constants/copy';
import { isInternalEmail, realEmail } from '@/src/utils/accountEmail';
import { getActionErrorMessage } from '@/src/utils/errors';
import { cleanName, emailChanged, validateEmail, validateName } from '@/src/utils/profileValidation';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type ProfileSaveResult = { pendingEmail: string | null; nameChanged: boolean };

type Props = {
  visible: boolean;
  canChangeEmail: boolean;
  onClose: () => void;
  onSaved: (result: ProfileSaveResult) => void;
};

export function EditProfileSheet({ visible, canChangeEmail, onClose, onSaved }: Props) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !user) return;
    setName(user.name);
    setEmail(realEmail(user.email) ?? '');
    setSubmitted(false);
    setSaveError(null);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const nameError = validateName(name);
  const currentEmail = realEmail(user.email);
  // An account without an email can leave the field blank; one with an email must keep a valid one.
  const wantsEmailChange = canChangeEmail && (currentEmail ? emailChanged(currentEmail, email) : email.trim() !== '');
  const emailError = wantsEmailChange
    ? validateEmail(email) ?? (isInternalEmail(email) ? 'Enter a valid email, like juan@example.com.' : null)
    : null;
  const nameChanged = cleanName(name) !== user.name;
  const nothingToSave = !nameChanged && !wantsEmailChange;

  const save = async () => {
    setSubmitted(true);
    setSaveError(null);
    if (nameError || emailError) return;
    if (nothingToSave) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      if (nameChanged) await saveName(user, name);
      const pendingEmail = wantsEmailChange ? await requestEmailChange(email) : null;
      if (nameChanged) await refreshProfile();
      onSaved({ pendingEmail: wantsEmailChange ? pendingEmail ?? email.trim() : null, nameChanged });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveError(getActionErrorMessage(err, copy.editSaveFailed));
    } finally {
      setSaving(false);
    }
  };

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

      <Text style={s.label}>{copy.emailLabel}</Text>
      <TextInput
        style={[s.input, !canChangeEmail && s.inputDisabled, submitted && emailError && s.inputError]}
        value={email}
        onChangeText={setEmail}
        editable={canChangeEmail}
        placeholder="juan@example.com"
        placeholderTextColor={Colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="done"
      />
      {submitted && emailError && <Text style={s.error}>{emailError}</Text>}
      {!canChangeEmail ? (
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
        <TouchableOpacity style={[s.saveBtn, saving && s.disabled]} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.saveText}>{copy.editSave}</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '800', color: Colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: Colors.inkSoft, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: Colors.inkFaint, marginTop: 14, marginBottom: 8 },
  input: {
    height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface,
    paddingHorizontal: 14, fontSize: 15.5, color: Colors.ink,
  },
  inputDisabled: { backgroundColor: Colors.surfaceAlt, color: Colors.inkFaint },
  inputError: { borderColor: Colors.danger, borderWidth: 1.5 },
  error: { fontSize: 12.5, color: Colors.danger, marginTop: 6 },
  saveError: { marginTop: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  hint: { flex: 1, fontSize: 12.5, color: Colors.inkFaint, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  saveBtn: { flex: 1.4, height: 52, borderRadius: 14, experimental_backgroundImage: brandGradientCss(90), alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: Colors.onDark },
  disabled: { opacity: 0.6 },
});
