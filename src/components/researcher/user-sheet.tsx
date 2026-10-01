import { UserType } from '@/src/auth/types';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { ResearcherColors as C } from '@/src/constants/colors';
import { updateUserRemote, type ResearcherUserRow } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { getActionErrorMessage } from '@/src/utils/errors';
import { isDormant } from '@/src/utils/userActivity';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Pending =
  | { kind: 'role'; role: UserType }
  | { kind: 'status'; next: 'active' | 'inactive' };

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
  if (pending.kind === 'role') {
    const toResearcher = pending.role === 'researcher';
    return {
      title: `Change role to ${toResearcher ? 'Researcher' : 'Farmer'}?`,
      message: `${user.name} will ${toResearcher ? 'gain' : 'lose'} researcher access.`,
      confirmText: 'Change role',
      destructive: false,
      icon: 'swap-horizontal-outline',
    };
  }
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

  useEffect(() => {
    if (!visible) return;
    setPending(null);
    setError(null);
  }, [visible, user?.id]);

  if (!user) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const askRole = (role: UserType) => {
    if (isSelf || role === user.user_type) return;
    setError(null);
    setPending({ kind: 'role', role });
  };

  const askStatus = () => {
    if (isSelf) return;
    setError(null);
    setPending({ kind: 'status', next: user.status === 'active' ? 'inactive' : 'active' });
  };

  const apply = async () => {
    if (!pending) return;
    setIsSaving(true);
    try {
      const fields = pending.kind === 'role' ? { user_type: pending.role } : { status: pending.next };
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

  const confirmation = pending ? describe(user, pending) : null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{userInitials(user.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.meta}>@{user.username} · {user.email}</Text>
          {user.user_type === 'farmer' && (
            <Text style={s.meta}>
              {user.last_decision_at ? `Last decision: ${formatShortDate(user.last_decision_at)}` : 'No decisions yet'}
            </Text>
          )}
        </View>
      </View>

      {confirmation ? (
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
      ) : (
        <>
          <Text style={s.sectionLabel}>ROLE</Text>
          <View style={s.roleBtnRow}>
            {(['farmer', 'researcher'] as const).map(role => {
              const active = user.user_type === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[s.roleBtn, active && s.roleBtnActive, isSelf && !active && s.disabled]}
                  onPress={() => askRole(role)}
                  disabled={isSelf}
                  accessibilityState={{ selected: active, disabled: isSelf }}
                >
                  <Text style={[s.roleBtnText, active && s.roleBtnTextActive]}>{role === 'farmer' ? 'Farmer' : 'Researcher'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.sectionLabel}>ACCOUNT</Text>
          {isDormant(user) && (
            <View style={s.dormantHint}>
              <Ionicons name="time-outline" size={15} color={C.amber} />
              <Text style={s.dormantHintText}>No activity in over a year. Consider deactivating.</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.statusBtn, user.status !== 'active' && s.statusBtnApprove, isSelf && s.statusBtnDisabled]}
            onPress={askStatus}
            disabled={isSelf}
          >
            <Ionicons
              name={user.status === 'active' ? 'person-remove-outline' : 'person-add-outline'}
              size={17}
              color={isSelf ? C.textFaint : user.status === 'active' ? C.danger : C.accent}
            />
            <Text style={[s.statusText, user.status !== 'active' && s.approveText, isSelf && s.statusTextDisabled]}>
              {user.status === 'active' ? 'Deactivate account' : user.status === 'pending' ? 'Approve account' : 'Reactivate account'}
            </Text>
          </TouchableOpacity>

          {isSelf && <Text style={s.selfHint}>You can&apos;t change your own role or account status.</Text>}
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.text },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  meta: { fontSize: 13, color: C.textSoft, marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 10 },
  roleBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  roleBtnActive: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  roleBtnText: { fontSize: 14.5, fontWeight: '700', color: C.textSoft },
  roleBtnTextActive: { color: C.accentDeepText },

  statusBtn: { flexDirection: 'row', gap: 8, height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.dangerBorder, backgroundColor: C.dangerBg, alignItems: 'center', justifyContent: 'center' },
  statusBtnApprove: { borderColor: C.cardBorderStrong, backgroundColor: C.accentTint },
  statusBtnDisabled: { borderColor: C.cardBorder, backgroundColor: C.fill },
  statusText: { fontSize: 14.5, fontWeight: '700', color: C.danger },
  approveText: { color: C.accent },
  statusTextDisabled: { color: C.textFaint },
  dormantHint: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBorder, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10 },
  dormantHintText: { flex: 1, fontSize: 13, color: C.amber, fontWeight: '600' },
  selfHint: { fontSize: 12.5, color: C.textFaint, textAlign: 'center', marginTop: 12 },

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
