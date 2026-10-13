import { UserType } from '@/src/auth/types';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { DropdownField } from '@/src/components/ui/dropdown-field';
import { ResearcherColors as C } from '@/src/constants/colors';
import { PH_PROVINCES, PH_PROVINCES_TO_CITIES } from '@/src/constants/ph-locations';
import { createUserRemote, CreateUserError } from '@/src/database/repositories/researcher';
import { getActionErrorMessage } from '@/src/utils/errors';
import { cleanEmail, cleanName } from '@/src/utils/profileValidation';
import { NewUserForm, validateNewUser } from '@/src/utils/newUserValidation';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const EMPTY: NewUserForm = { name: '', username: '', email: '', password: '', province: '', city: '' };

export function CreateUserSheet({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (summary: { name: string; email: string; role: UserType }) => void;
}) {
  const [form, setForm] = useState<NewUserForm>(EMPTY);
  const [role, setRole] = useState<UserType>('farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(EMPTY);
    setRole('farmer');
    setShowPassword(false);
    setSubmitted(false);
    setServerError(null);
  }, [visible]);

  const errors = validateNewUser(form);
  const show = (key: keyof NewUserForm) => submitted && errors[key];
  const set = (key: keyof NewUserForm) => (value: string) => setForm(f => ({ ...f, [key]: value }));
  const cities = form.province ? PH_PROVINCES_TO_CITIES[form.province] ?? [] : [];

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const name = cleanName(form.name);
    const email = cleanEmail(form.email);
    try {
      await createUserRemote({
        name,
        username: form.username.trim(),
        email,
        password: form.password,
        user_type: role === 'researcher' ? 'researcher' : 'farmer',
        city: form.city.trim(),
        province: form.province.trim(),
      });
      onCreated({ name, email, role });
    } catch (err) {
      console.error('Failed to create user:', err);
      setServerError(err instanceof CreateUserError ? err.message : getActionErrorMessage(err, 'Could not create the account. Please try again.'));
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

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={s.sheet} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text style={s.title}>Add user</Text>
      <Text style={s.subtitle}>The account is active right away. Share the email and temporary password with them.</Text>

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
            <Text style={[s.roleText, role === r && s.roleTextActive]}>{r === 'farmer' ? 'Farmer' : 'Researcher'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {role === 'researcher' && (
        <Text style={s.roleHint}>Researchers can see every decision and manage users.</Text>
      )}

      {field('name', 'NAME', { placeholder: 'Full name', autoCapitalize: 'words', textContentType: 'name' })}
      {field('username', 'USERNAME', { placeholder: 'e.g. juan.dc', autoCapitalize: 'none', autoCorrect: false })}
      {field('email', 'EMAIL', { placeholder: 'name@example.com', autoCapitalize: 'none', autoCorrect: false, keyboardType: 'email-address', textContentType: 'emailAddress' })}

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
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, color: C.text },
  inputError: { borderColor: C.danger },
  error: { fontSize: 12.5, color: C.danger, marginTop: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput: { flex: 1, fontSize: 15, color: C.text, height: '100%' },
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
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.text },
  saveBtn: { flex: 1.4, height: 52, borderRadius: 14, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15.5, fontWeight: '800', color: C.accentDeepText },
  disabled: { opacity: 0.5 },
});
