import { UserType } from '@/src/auth/types';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { DropdownField } from '@/src/components/ui/dropdown-field';
import { inputSurface, inputTextStyle, ResearcherColors as C } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { ROLE_SHORT } from '@/src/constants/labels';
import { PH_PROVINCES, PH_PROVINCES_TO_CITIES } from '@/src/constants/ph-locations';
import { createUserRemote } from '@/src/database/repositories/researcher';
import { FunctionError } from '@/src/database/supabase/invokeFunction';
import { getActionErrorMessage } from '@/src/utils/errors';
import { normalizeUsername } from '@/src/utils/accountEmail';
import { cleanEmail, cleanName } from '@/src/utils/profileValidation';
import { NewUserForm, validateNewUser } from '@/src/utils/newUserValidation';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const NO_EMAIL_HINT = "Without an email, they can't reset a forgotten password themselves. You can reset it for them from Field Users.";

const EMPTY: NewUserForm = { name: '', username: '', email: '', password: '', province: '', city: '' };

interface CreatedAccount { name: string; username: string; password: string; role: UserType }

export const credentialsText = ({ name, username, password }: CreatedAccount) =>
  `FarmAssist account for ${name}\nUsername: ${username}\nTemporary password: ${password}\nPlease change your password after signing in.`;

function CreatedView({ account, onDone }: { account: CreatedAccount; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(credentialsText(account));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy credentials:', err);
    }
  };

  return (
    <>
      <View style={s.createdIcon}>
        <Ionicons name="checkmark-circle" size={30} color={C.accent} />
      </View>
      <Text style={s.title}>Account created</Text>
      <Text style={s.subtitle}>{account.name} can sign in now. Send them these details.</Text>

      <View style={s.credBox}>
        <Text style={s.credLabel}>USERNAME</Text>
        <Text style={s.credValue} selectable>{account.username}</Text>
        <View style={s.credDivider} />
        <Text style={s.credLabel}>TEMPORARY PASSWORD</Text>
        <Text style={s.credValue} selectable>{account.password}</Text>
      </View>

      <TouchableOpacity
        style={[s.copyBtn, copied && s.copyBtnDone]}
        onPress={copy}
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Credentials copied' : 'Copy credentials'}
      >
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? C.accent : C.text} />
        <Text style={[s.copyText, copied && s.copyTextDone]}>{copied ? 'Copied' : 'Copy credentials'}</Text>
      </TouchableOpacity>

      <Text style={s.roleHint}>This password won&apos;t be shown again. Ask them to change it after signing in (Profile → Change password).</Text>
      {account.role === 'researcher' && <Text style={s.roleHint}>Admin accounts don&apos;t appear in Field Users.</Text>}

      <TouchableOpacity style={[s.saveBtn, s.doneBtn]} onPress={onDone} accessibilityRole="button">
        <Text style={s.saveText}>Done</Text>
      </TouchableOpacity>
    </>
  );
}

export function CreateUserSheet({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (summary: { name: string; username: string; role: UserType }) => void;
}) {
  const [form, setForm] = useState<NewUserForm>(EMPTY);
  const [role, setRole] = useState<UserType>('farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  // Reset on open, not close, so the exit animation doesn't flash the empty form.
  useEffect(() => {
    if (!visible) return;
    setCreated(null);
    setForm(EMPTY);
    setRole('farmer');
    setShowPassword(false);
    setSubmitted(false);
    setServerError(null);
  }, [visible]);

  const errors = validateNewUser(form, role);
  const show = (key: keyof NewUserForm) => submitted && errors[key];
  const set = (key: keyof NewUserForm) => (value: string) => setForm(f => ({ ...f, [key]: value }));
  const cities = form.province ? PH_PROVINCES_TO_CITIES[form.province] ?? [] : [];

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const name = cleanName(form.name);
    const username = normalizeUsername(form.username);
    try {
      await createUserRemote({
        name,
        username,
        email: cleanEmail(form.email),
        password: form.password,
        user_type: role === 'researcher' ? 'researcher' : 'farmer',
        city: form.city.trim(),
        province: form.province.trim(),
      });
      setCreated({ name, username, password: form.password, role });
      onCreated({ name, username, role });
    } catch (err) {
      console.error('Failed to create user:', err);
      setServerError(err instanceof FunctionError ? err.message : getActionErrorMessage(err, 'Could not create the account. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: 'name' | 'username' | 'email', label: string, props: React.ComponentProps<typeof TextInput>) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, show(key) && s.inputError]}
        value={form[key]}
        onChangeText={set(key)}
        placeholderTextColor={C.textMuted}
        editable={!saving}
        {...props}
      />
      {show(key) && <Text style={s.error}>{errors[key]}</Text>}
    </>
  );

  if (created) {
    return (
      <BottomSheet visible={visible} onClose={onClose} style={s.sheet}>
        <CreatedView account={created} onDone={onClose} />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={s.sheet} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>Add user</Text>
      <Text style={s.subtitle}>The account is active right away. Share the username and temporary password with them.</Text>

      <Text style={s.label}>ROLE</Text>
      <View style={s.roleRow}>
        {(['farmer', 'researcher'] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[s.roleBtn, role === r && s.roleBtnActive]}
            onPress={() => setRole(r)}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ selected: role === r }}
          >
            <Text style={[s.roleText, role === r && s.roleTextActive]}>{ROLE_SHORT[r]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {role === 'researcher' && (
        <Text style={s.roleHint}>Researchers can see every decision and manage users.</Text>
      )}

      {field('name', 'NAME', { placeholder: 'Full name', autoCapitalize: 'words', textContentType: 'name' })}
      {field('username', 'USERNAME', { placeholder: 'e.g. juan.dc', autoCapitalize: 'none', autoCorrect: false })}
      {field('email', role === 'researcher' ? 'EMAIL' : 'EMAIL (OPTIONAL)', { placeholder: 'name@example.com', autoCapitalize: 'none', autoCorrect: false, keyboardType: 'email-address', textContentType: 'emailAddress' })}
      {role === 'farmer' && !form.email.trim() && <Text style={s.roleHint}>{NO_EMAIL_HINT}</Text>}

      <Text style={s.label}>TEMPORARY PASSWORD</Text>
      <View style={[s.input, s.passwordRow, show('password') && s.inputError]}>
        <TextInput
          style={s.passwordInput}
          value={form.password}
          onChangeText={set('password')}
          placeholder="At least 6 characters"
          placeholderTextColor={C.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(v => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textFaint} />
        </TouchableOpacity>
      </View>
      {show('password') && <Text style={s.error}>{errors.password}</Text>}

      <View style={s.dropdownGap} />
      <DropdownField
        label="Province"
        value={form.province}
        options={PH_PROVINCES}
        onSelect={p => setForm(f => ({ ...f, province: p, city: '' }))}
        error={errors.province}
        touched={submitted}
        placeholder="Select province"
        disabled={saving}
      />
      <DropdownField
        label="City / municipality"
        value={form.city}
        options={cities}
        onSelect={set('city')}
        error={errors.city}
        touched={submitted}
        placeholder="Select city / municipality"
        disabled={saving || !form.province}
      />

      {serverError && (
        <View style={s.serverError}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={s.serverErrorText}>{serverError}</Text>
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.saveBtn, saving && s.disabled]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={C.accentDeepText} /> : <Text style={s.saveText}>Create account</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheet: { paddingBottom: 30, maxHeight: '94%' },
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginBottom: 6, lineHeight: 19 },

  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginTop: 14, marginBottom: 8 },
  input: { ...inputSurface, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, ...inputTextStyle },
  inputError: { borderColor: C.danger },
  error: { fontSize: 12.5, color: C.danger, marginTop: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput: { flex: 1, fontSize: 15, ...inputTextStyle, height: '100%' },
  dropdownGap: { height: 14 },

  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  roleBtnActive: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  roleText: { fontSize: 14.5, fontWeight: '700', color: C.textSoft },
  roleTextActive: { color: C.accentDeepText },
  roleHint: { fontSize: 12.5, color: C.textSoft, marginTop: 8 },

  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerBg, borderRadius: 12, padding: 12, marginTop: 16 },
  serverErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.danger },

  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelBtn: { flex: 1, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.text },
  saveBtn: { flex: 1.4, height: BUTTON_HEIGHT, borderRadius: 12, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: C.accentDeepText },
  disabled: { opacity: 0.5 },

  createdIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  credBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorderStrong, borderRadius: 14, padding: 14, marginTop: 12 },
  credLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 4 },
  credValue: { fontSize: 16.5, fontWeight: '700', color: C.text },
  credDivider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorderStrong, marginTop: 14, marginBottom: 6 },
  copyBtnDone: { borderColor: C.accent, backgroundColor: C.accentTint },
  copyText: { fontSize: 15, fontWeight: '700', color: C.text },
  copyTextDone: { color: C.accent },
  doneBtn: { flex: 0, height: BUTTON_HEIGHT, marginTop: 22 },
});
