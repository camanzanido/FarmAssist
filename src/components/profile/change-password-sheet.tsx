import { changePassword } from '@/src/auth/passwordService';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { Colors, inputSurface, inputTextStyle } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { changePasswordCopy as copy } from '@/src/constants/copy';
import { supabase } from '@/src/database/supabase/supabase';
import { getAuthErrorMessage, isInvalidCredentialsError } from '@/src/utils/errors';
import { validatePassword, validatePasswordConfirm } from '@/src/utils/passwordValidation';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ChangePasswordSheet({ visible, onClose, onChanged }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setShow(false);
    setSubmitted(false);
    setSaveError(null);
  }, [visible]);

  const currentError = current ? null : copy.currentRequired;
  const nextError = validatePassword(next) ?? (next && next === current ? copy.sameAsCurrent : null);
  const confirmError = validatePasswordConfirm(next, confirm);

  const save = async () => {
    setSubmitted(true);
    setSaveError(null);
    if (currentError || nextError || confirmError) return;
    setSaving(true);
    try {
      // The session's email is the login email, including the hidden one on accounts without an email.
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;
      if (!email) throw new Error(copy.signedOut);
      await changePassword(email, current, next);
      onChanged();
    } catch (err) {
      console.error('Failed to change password:', err);
      setSaveError(isInvalidCredentialsError(err) ? copy.currentWrong : getAuthErrorMessage(err, copy.failed));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, error: string | null, withToggle = false) => (
    <>
      <Text style={s.label}>{label}</Text>
      <View style={[s.input, submitted && error && s.inputError]}>
        <TextInput
          style={s.inputText}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />
        {withToggle && (
          <TouchableOpacity
            onPress={() => setShow(v => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Hide passwords' : 'Show passwords'}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>
      {submitted && error && <Text style={s.error}>{error}</Text>}
    </>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>{copy.title}</Text>
      <Text style={s.subtitle}>{copy.subtitle}</Text>

      {field(copy.currentLabel, current, setCurrent, currentError, true)}
      {field(copy.newLabel, next, setNext, nextError)}
      {field(copy.confirmLabel, confirm, setConfirm, confirmError)}

      {saveError && <Text style={[s.error, s.saveError]}>{saveError}</Text>}

      <View style={s.actions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
          <Text style={s.cancelText}>{copy.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.saveBtn, saving && s.disabled]} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.saveText}>{copy.save}</Text>}
        </TouchableOpacity>
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
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  inputText: { flex: 1, fontSize: 15.5, ...inputTextStyle, height: '100%' },
  inputError: { borderColor: Colors.danger, borderWidth: 1.5 },
  error: { fontSize: 12.5, color: Colors.danger, marginTop: 6 },
  saveError: { marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelBtn: { flex: 1, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  saveBtn: { flex: 1.4, height: BUTTON_HEIGHT, borderRadius: 12, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: Colors.onDark },
  disabled: { opacity: 0.5 },
});
