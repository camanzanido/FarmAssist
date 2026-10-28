import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ChangePasswordSheet } from '@/src/components/profile/change-password-sheet';
import { EditProfileSheet } from '@/src/components/profile/edit-profile-sheet';
import { PopoverMenu } from '@/src/components/ui/popover-menu';
import { ResearcherColors as C } from '@/src/constants/colors';
import { changePasswordCopy, profileCopy, termsCopy } from '@/src/constants/copy';
import { ROLE_SHORT } from '@/src/constants/labels';
import { TAB_SCREEN_EDGES, wideColumn } from '@/src/constants/layout';
import { updateUserRemote } from '@/src/database/repositories/researcher';
import { useEditProfile } from '@/src/hooks/use-edit-profile';
import { useNavLock } from '@/src/hooks/use-nav-lock';
import { displayEmail } from '@/src/utils/accountEmail';
import { getActionErrorMessage } from '@/src/utils/errors';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function ResearcherProfileScreen() {
  const { user, signOut, refreshProfile } = useAuth();
  const { confirm, notify } = useFeedback();
  const nav = useNavLock();
  const edit = useEditProfile();
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleLogout() {
    const confirmed = await confirm({
      title: 'Log out?',
      message: 'You will need to sign in again to access researcher tools.',
      confirmText: 'Log out',
      tone: 'destructive',
      icon: 'log-out-outline',
    });
    if (confirmed) await signOut();
  }

  async function handleDeactivate() {
    if (!user) return;
    const confirmed = await confirm({
      title: 'Deactivate your account?',
      message: 'You will lose access to admin tools right away. Another admin cannot turn it back on; it has to be reactivated in the Supabase dashboard.',
      confirmText: 'Deactivate',
      tone: 'destructive',
      icon: 'person-remove-outline',
    });
    if (!confirmed) return;
    try {
      await updateUserRemote(user.id, { status: 'inactive' });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to deactivate own account:', err);
      notify.error('Could not deactivate', getActionErrorMessage(err, 'Please try again.'));
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe} edges={TAB_SCREEN_EDGES}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
        </View>

        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user.name}</Text>
            <Text style={s.username}>@{user.username}</Text>
          </View>
          <PopoverMenu
            icon="settings-outline"
            motion="spin"
            accessibilityLabel={profileCopy.settingsLabel}
            items={[
              { key: 'edit', label: profileCopy.editProfile, icon: 'create-outline', onPress: edit.open },
              { key: 'password', label: changePasswordCopy.row, icon: 'key-outline', onPress: () => setPasswordOpen(true) },
            ]}
          />
        </View>

        <View style={s.list}>
          <View style={[s.row, s.rowBorder, s.rowTop]}>
            <Ionicons name="mail-outline" size={19} color={C.textSoft} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={s.emailRow}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={[s.rowValue, s.emailValue]} numberOfLines={1}>{displayEmail(user.email)}</Text>
              </View>
              {edit.pendingEmail && <Text style={s.pendingEmail}>{profileCopy.pendingEmail(edit.pendingEmail)}</Text>}
            </View>
          </View>
          <View style={[s.row, s.rowBorder]}>
            <Ionicons name="shield-checkmark-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>Account type</Text>
            <Text style={s.rowValue}>{ROLE_SHORT.researcher}</Text>
          </View>
          <PressableScale style={[s.row, s.rowBorder]} onPress={() => nav.push('/about')} accessibilityRole="button">
            <Ionicons name="information-circle-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{profileCopy.about}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </PressableScale>
          <PressableScale style={[s.row, s.rowBorder]} onPress={() => nav.push('/onboarding?replay=1')} accessibilityRole="button">
            <Ionicons name="book-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{profileCopy.viewIntro}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </PressableScale>
          <PressableScale style={s.row} onPress={() => nav.push('/terms')} accessibilityRole="button">
            <Ionicons name="document-text-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{termsCopy.profileRow}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </PressableScale>
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.logoutRow} activeOpacity={0.8}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeactivate} style={s.deactivateRow} activeOpacity={0.8} accessibilityRole="button">
          <Text style={s.deactivateText}>Deactivate my account</Text>
        </TouchableOpacity>
      </ScrollView>
      <EditProfileSheet visible={edit.isOpen} online pendingEmail={edit.pendingEmail} onClose={edit.close} onSaved={edit.onSaved} />
      <ChangePasswordSheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onChanged={() => {
          setPasswordOpen(false);
          notify.success(changePasswordCopy.doneTitle, changePasswordCopy.doneBody);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 16 },

  header: { marginBottom: 22 },
  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 22 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '800', color: C.accentDeepText },
  name: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  username: { fontSize: 13.5, color: C.textSoft, marginTop: 2 },

  list: { borderTopWidth: 1, borderTopColor: C.divider, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: C.text },
  rowValue: { fontSize: 13.5, color: C.textSoft, maxWidth: '45%', textAlign: 'right' },
  rowTop: { alignItems: 'flex-start' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emailValue: { flex: 1, maxWidth: undefined },
  pendingEmail: { fontSize: 12.5, color: C.amberText, marginTop: 6, lineHeight: 17 },

  logoutRow: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.danger },
  deactivateRow: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  deactivateText: { fontSize: 13.5, fontWeight: '600', color: C.textSoft, textDecorationLine: 'underline' },
});
