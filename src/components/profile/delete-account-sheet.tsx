import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { Colors, inputSurface, inputTextStyle } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { DELETE_WORD, isDeleteConfirmed } from '@/src/utils/deleteConfirm';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
};

// onConfirm resolves to an error message to show, or null once the account is gone.
export function DeleteAccountSheet({ visible, onClose, onConfirm }: Props) {
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setError(null);
  }, [visible]);

  const ready = isDeleteConfirmed(text) && !deleting;

  const submit = async () => {
    if (!ready) return;
    setDeleting(true);
    setError(null);
    const message = await onConfirm();
    setDeleting(false);
    if (message) setError(message);
  };

  return (
    <BottomSheet visible={visible} onClose={deleting ? () => {} : onClose} avoidKeyboard scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>Delete your account?</Text>
      <Text style={s.body}>
        You&apos;ll be signed out and won&apos;t be able to sign in again. Another admin can&apos;t restore it; only the Supabase dashboard can.
      </Text>

      <Text style={s.label}>Type {DELETE_WORD} to confirm</Text>
      <View style={s.input}>
        <TextInput
          style={s.inputText}
          value={text}
          onChangeText={setText}
          placeholder={DELETE_WORD}
          placeholderTextColor={Colors.inkFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!deleting}
          accessibilityLabel={`Type ${DELETE_WORD} to confirm`}
        />
      </View>

      {error && <Text style={s.error}>{error}</Text>}

      <View style={s.actions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={deleting}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.deleteBtn, !ready && s.disabled]}
          onPress={submit}
          disabled={!ready}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
        >
          {deleting ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.deleteText}>Delete account</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '800', color: Colors.ink, marginBottom: 6 },
  body: { fontSize: 14, color: Colors.inkSoft, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: Colors.inkFaint, marginTop: 18, marginBottom: 8 },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, ...inputSurface, paddingHorizontal: 14, justifyContent: 'center' },
  inputText: { fontSize: 15.5, ...inputTextStyle, paddingVertical: 12, letterSpacing: 1 },
  error: { fontSize: 12.5, color: Colors.danger, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelBtn: { flex: 1, minHeight: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  deleteBtn: { flex: 1.4, minHeight: BUTTON_HEIGHT, borderRadius: 12, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 15.5, fontWeight: '800', color: Colors.onDark },
  disabled: { opacity: 0.4 },
});
