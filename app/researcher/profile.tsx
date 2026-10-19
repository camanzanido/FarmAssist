import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ChangePasswordSheet } from '@/src/components/profile/change-password-sheet';
import { EditProfileSheet } from '@/src/components/profile/edit-profile-sheet';
import { cardShadow, ResearcherColors as C } from '@/src/constants/colors';
import { changePasswordCopy, profileCopy } from '@/src/constants/copy';
import { wideColumn } from '@/src/constants/layout';
import { useEditProfile } from '@/src/hooks/use-edit-profile';
import { displayEmail } from '@/src/utils/accountEmail';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function ResearcherProfileScreen() {
  const { user, signOut } = useAuth();
  const { confirm, notify } = useFeedback();
  const router = useRouter();
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

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>RESEARCHER</Text>
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
        </View>

        <View style={s.card}>
          <TouchableOpacity style={[s.row, s.rowBorder]} onPress={edit.open} activeOpacity={0.7} accessibilityRole="button">
            <Ionicons name="create-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{profileCopy.editProfile}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>
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
          <TouchableOpacity style={[s.row, s.rowBorder]} onPress={() => setPasswordOpen(true)} activeOpacity={0.7} accessibilityRole="button">
            <Ionicons name="key-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{changePasswordCopy.row}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>
          <View style={[s.row, s.rowBorder]}>
            <Ionicons name="shield-checkmark-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>Account type</Text>
            <Text style={s.rowValue}>Researcher</Text>
          </View>
          <TouchableOpacity style={[s.row, s.rowBorder]} onPress={() => router.push('/about')} activeOpacity={0.7} accessibilityRole="button">
            <Ionicons name="information-circle-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{profileCopy.about}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() => router.push('/onboarding?replay=1')} activeOpacity={0.7} accessibilityRole="button">
            <Ionicons name="book-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>{profileCopy.viewIntro}</Text>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.logoutRow} activeOpacity={0.8}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
      <EditProfileSheet visible={edit.isOpen} canChangeEmail onClose={edit.close} onSaved={edit.onSaved} />
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
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 40 },

  header: { marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textFaint, marginBottom: 5 },
  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 22 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '800', color: C.accentDeepText },
  name: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  username: { fontSize: 13.5, color: C.textSoft, marginTop: 2 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24, ...cardShadow },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: C.text },
  rowValue: { fontSize: 13.5, color: C.textSoft, maxWidth: '45%', textAlign: 'right' },
  rowTop: { alignItems: 'flex-start' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emailValue: { flex: 1, maxWidth: undefined },
  pendingEmail: { fontSize: 12.5, color: C.amberText, marginTop: 6, lineHeight: 17 },

  logoutRow: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.danger },
});
