import 'react-native-get-random-values';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { inputSurface, inputTextStyle, ResearcherColors as C } from '@/src/constants/colors';
import { BUTTON_HEIGHT } from '@/src/constants/layout';
import { resetPasswordRemote, updateUserRemote, type ResearcherUserRow } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { FunctionError } from '@/src/database/supabase/invokeFunction';
import { displayEmail, realEmail } from '@/src/utils/accountEmail';
import { getActionErrorMessage } from '@/src/utils/errors';
import { validatePassword } from '@/src/utils/passwordValidation';
import { generateTempPassword } from '@/src/utils/tempPassword';
import { isDormant } from '@/src/utils/userActivity';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Pending = { next: 'active' | 'inactive' };

type PasswordReset = { step: 'form' } | { step: 'done'; password: string };

type Confirmation = {
  title: string;
  message: string;
  confirmText: string;
  destructive: boolean;
  icon: keyof typeof Ionicons.glyphMap;
};

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function describe(user: User, pending: Pending): Confirmation {
  const deactivating = pending.next === 'inactive';
  const isApproval = user.status === 'pending';
  const isResearcher = user.user_type === 'researcher';
  return {
    title: deactivating ? 'Deactivate this account?' : isApproval ? 'Approve this account?' : 'Reactivate this account?',
    message: deactivating
      ? isResearcher
        ? `${user.name} will lose access to researcher tools until reactivated. They can still sign in.`
        : `${user.name} can still sign in and use the app. Their account will be marked inactive.`
      : isApproval
        ? `${user.name} will gain full ${isResearcher ? 'researcher ' : ''}access.`
        : isResearcher
          ? `${user.name} will regain access to researcher tools.`
          : `${user.name}'s account will be marked active again.`,
    confirmText: deactivating ? 'Deactivate' : isApproval ? 'Approve' : 'Reactivate',
    destructive: deactivating,
    icon: deactivating ? 'person-remove-outline' : 'person-add-outline',
  };
}

export function UserSheet({ visible, user, isSelf, onClose, onChanged }: {
  visible: boolean;
  user: ResearcherUserRow | null;
  isSelf: boolean;
  onClose: () => void;
  onChanged: (updated: ResearcherUserRow) => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState<PasswordReset | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPending(null);
    setError(null);
    setReset(null);
  }, [visible, user?.id]);

  if (!user) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  // Pending researcher accounts from old APKs still need approving; every other admin account is off limits.
  const isPeerAdmin = !isSelf && user.user_type === 'researcher' && user.status !== 'pending';

  const askStatus = () => {
    if (isSelf || isPeerAdmin) return;
    setError(null);
    setPending({ next: user.status === 'active' ? 'inactive' : 'active' });
  };

  const apply = async () => {
    if (!pending) return;
    setIsSaving(true);
    try {
      const fields = { status: pending.next };
      await updateUserRemote(user.id, fields);
      onChanged({ ...user, ...fields });
      setPending(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const startReset = () => {
    if (isSelf || user.user_type !== 'farmer') return;
    setError(null);
    setTempPassword(generateTempPassword());
    setReset({ step: 'form' });
  };

  const applyReset = async () => {
    const invalid = validatePassword(tempPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await resetPasswordRemote(user.id, tempPassword);
      setReset({ step: 'done', password: tempPassword });
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError(err instanceof FunctionError ? err.message : getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmation = pending ? describe(user, pending) : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{userInitials(user.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.meta}>@{user.username} · {displayEmail(user.email)}</Text>
          {user.user_type === 'farmer' && (
            <Text style={s.meta}>
              {user.last_decision_at ? `Last decision: ${formatShortDate(user.last_decision_at)}` : 'No decisions yet'}
            </Text>
          )}
        </View>
      </View>

      {reset?.step === 'form' ? (
        <View style={s.confirmCard}>
          <View style={s.confirmIcon}>
            <Ionicons name="key-outline" size={20} color={C.accent} />
          </View>
          <Text style={s.confirmTitle}>Set a temporary password</Text>
          <Text style={s.confirmMessage}>
            {user.name}&apos;s old password will stop working. Give them this one; they can change it in Profile after signing in.
          </Text>
          <View style={s.tempRow}>
            <TextInput
              style={s.tempInput}
              value={tempPassword}
              onChangeText={setTempPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              accessibilityLabel="Temporary password"
            />
            <TouchableOpacity
              style={s.generateBtn}
              onPress={() => setTempPassword(generateTempPassword())}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Make a new password"
            >
              <Ionicons name="refresh" size={18} color={C.accent} />
            </TouchableOpacity>
          </View>
          {error && <Text style={s.error}>{error}</Text>}
          <View style={s.confirmActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setReset(null)} disabled={isSaving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.confirmBtn, isSaving && s.disabled]} onPress={applyReset} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color={C.accentDeepText} />
                : <Text style={s.confirmBtnText}>Reset password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : reset?.step === 'done' ? (
        <View style={s.confirmCard}>
          <View style={s.confirmIcon}>
            <Ionicons name="checkmark" size={22} color={C.accent} />
          </View>
          <Text style={s.confirmTitle}>Password reset</Text>
          <Text style={s.confirmMessage}>Give {user.name} these details. This is the only time the password is shown.</Text>
          <View style={s.doneBox}>
            <Text style={s.doneLabel}>USERNAME</Text>
            <Text style={s.doneValue} selectable>{user.username}</Text>
            <Text style={[s.doneLabel, s.doneLabelGap]}>TEMPORARY PASSWORD</Text>
            <Text style={s.doneValue} selectable>{reset.password}</Text>
          </View>
          <TouchableOpacity style={[s.confirmBtn, s.doneBtn]} onPress={() => setReset(null)}>
            <Text style={s.confirmBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : confirmation ? (
        <View style={s.confirmCard}>
          <View style={[s.confirmIcon, confirmation.destructive && s.confirmIconDanger]}>
            <Ionicons name={confirmation.icon} size={20} color={confirmation.destructive ? C.danger : C.accent} />
          </View>
          <Text style={s.confirmTitle}>{confirmation.title}</Text>
          <Text style={s.confirmMessage}>{confirmation.message}</Text>
          {error && <Text style={s.error}>{error}</Text>}
          <View style={s.confirmActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setPending(null)} disabled={isSaving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, confirmation.destructive && s.confirmBtnDanger, isSaving && s.disabled]}
              onPress={apply}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator color={C.accentDeepText} />
                : <Text style={s.confirmBtnText}>{confirmation.confirmText}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : isSelf || isPeerAdmin ? (
        <View style={s.lockedCard}>
          <Ionicons name="lock-closed-outline" size={18} color={C.textSoft} />
          <Text style={s.lockedText}>
            {isSelf
              ? 'This is your account. Change your password or deactivate it from Profile.'
              : 'Admin accounts are managed by the system owner. You can manage field user accounts.'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          {isDormant(user) && (
            <View style={s.dormantHint}>
              <Ionicons name="time-outline" size={15} color={C.amber} />
              <Text style={s.dormantHintText}>No activity in over a year. Consider deactivating.</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.statusBtn, user.status !== 'active' && s.statusBtnApprove]}
            onPress={askStatus}
          >
            <Ionicons
              name={user.status === 'active' ? 'person-remove-outline' : 'person-add-outline'}
              size={17}
              color={user.status === 'active' ? C.danger : C.accent}
            />
            <Text style={[s.statusText, user.status !== 'active' && s.approveText]}>
              {user.status === 'active' ? 'Deactivate account' : user.status === 'pending' ? 'Approve account' : 'Reactivate account'}
            </Text>
          </TouchableOpacity>

          {user.user_type === 'farmer' && (
            <TouchableOpacity style={s.resetBtn} onPress={startReset}>
              <Ionicons name="key-outline" size={17} color={C.text} />
              <Text style={s.resetText}>Reset password</Text>
            </TouchableOpacity>
          )}
          {user.user_type === 'farmer' && !realEmail(user.email) && (
            <Text style={s.selfHint}>This account has no email, so only an admin can reset its password.</Text>
          )}
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.text },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  meta: { fontSize: 13, color: C.textSoft, marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 10 },

  statusBtn: { flexDirection: 'row', gap: 8, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1, borderColor: C.dangerBorder, backgroundColor: C.dangerBg, alignItems: 'center', justifyContent: 'center' },
  statusBtnApprove: { borderColor: C.cardBorderStrong, backgroundColor: C.accentTint },
  statusText: { fontSize: 14.5, fontWeight: '700', color: C.danger },
  approveText: { color: C.accent },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.fill, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14 },
  lockedText: { flex: 1, fontSize: 13.5, color: C.textSoft, lineHeight: 19 },
  dormantHint: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBorder, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10 },
  dormantHintText: { flex: 1, fontSize: 13, color: C.amber, fontWeight: '600' },
  selfHint: { fontSize: 12.5, color: C.textFaint, textAlign: 'center', marginTop: 12 },
  resetBtn: { flexDirection: 'row', gap: 8, height: BUTTON_HEIGHT, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorderStrong, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  resetText: { fontSize: 14.5, fontWeight: '700', color: C.text },
  tempRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 14 },
  tempInput: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, ...inputSurface, paddingHorizontal: 14, fontSize: 17, fontWeight: '700', letterSpacing: 1, ...inputTextStyle },
  generateBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorderStrong, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  doneBox: { alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginTop: 14 },
  doneLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint },
  doneLabelGap: { marginTop: 10 },
  doneValue: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 3, letterSpacing: 0.5 },
  doneBtn: { alignSelf: 'stretch', flex: 0, marginTop: 16 },

  confirmCard: { backgroundColor: C.fill, borderRadius: 16, padding: 18, alignItems: 'center' },
  confirmIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmIconDanger: { backgroundColor: C.dangerBg },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  confirmMessage: { fontSize: 13.5, color: C.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  error: { fontSize: 13, color: C.danger, textAlign: 'center', marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorderStrong, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14.5, fontWeight: '700', color: C.text },
  confirmBtn: { flex: 1.3, height: 48, borderRadius: 12, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDanger: { backgroundColor: C.danger },
  confirmBtnText: { fontSize: 14.5, fontWeight: '800', color: C.accentDeepText },
  disabled: { opacity: 0.5 },
});
