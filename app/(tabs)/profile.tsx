// app/(tabs)/profile.tsx
import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { connectSync } from '@/src/auth/authService';
import { brandGradientCss, CARD_PADDING, CARD_RADIUS, cardSurface, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { changePasswordCopy, helpCopy, profileCopy as copy, termsCopy } from '@/src/constants/copy';
import { ROLE_SHORT } from '@/src/constants/labels';
import { db } from '@/src/database/powersync/powersync';
import { getDecisionsByUser, getStagedDecisionIds } from '@/src/database/repositories/decisions';
import { getLocationsByUser, type Location } from '@/src/database/repositories/locations';
import { clearSyncErrors } from '@/src/database/repositories/syncErrors';
import { ChangePasswordSheet } from '@/src/components/profile/change-password-sheet';
import { EditProfileSheet } from '@/src/components/profile/edit-profile-sheet';
import { PopoverMenu } from '@/src/components/ui/popover-menu';
import { useEditProfile } from '@/src/hooks/use-edit-profile';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { displayEmail, realEmail } from '@/src/utils/accountEmail';
import { useNavLock } from '@/src/hooks/use-nav-lock';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatSyncTime(date: Date | null): string {
  if (!date) return 'never';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { confirm, notify } = useFeedback();
  const nav = useNavLock();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const isAuthenticated = !!user;
  const sync = useSyncStatus();
  const edit = useEditProfile();

  const [decisionCount, setDecisionCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [decisions, locs, batch, stagedIds] = await Promise.all([
        getDecisionsByUser(user.id),
        getLocationsByUser(user.id),
        db.getCrudBatch(1000),
        getStagedDecisionIds(),
      ]);
      setDecisionCount(decisions.length);
      setLocations(locs);

      const queuedIds = (batch?.crud ?? [])
        .filter(e => e.table === 'decisions')
        .map(e => e.id);
      setPendingCount(new Set([...queuedIds, ...stagedIds]).size);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setLoadError(true);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogout() {
    const confirmed = await confirm({
      title: copy.logoutConfirmTitle,
      message: copy.logoutConfirmBody,
      confirmText: copy.logOut,
      cancelText: copy.logoutCancel,
      tone: 'destructive',
      icon: 'log-out-outline',
    });
    if (confirmed) await signOut();
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      await connectSync();
    } catch (err) {
      console.error('Failed to reconnect sync:', err);
    } finally {
      setIsSyncing(false);
      load();
    }
  }

  async function handleDismissSyncErrors() {
    try {
      await clearSyncErrors();
    } catch (err) {
      console.error('Failed to clear sync errors:', err);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      {!isAuthenticated ? (
        <View style={s.signedOutScreen}>
          <View style={s.signedOutTop}>
            <TouchableOpacity onPress={() => nav.push('/about')} hitSlop={8} style={s.topIcon} accessibilityRole="button" accessibilityLabel={copy.about}>
              <Ionicons name="information-circle-outline" size={24} color={Colors.ink} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.push('/onboarding?replay=1')} hitSlop={8} style={s.topIcon} accessibilityRole="button" accessibilityLabel={copy.viewIntro}>
              <Ionicons name="book-outline" size={23} color={Colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={s.signedOutWrap}>
            <Image
              source={require('@/assets/images/FarmAssist-logo.png')}
              style={s.signedOutLogo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={s.signedOutTitle}>{copy.signedOutTitle}</Text>
            <Text style={s.signedOutSubtitle}>{copy.signedOutSubtitle}</Text>

            <PressableScale style={s.primaryBtn} onPress={() => nav.push('/(auth)/login')} haptic>
              <Text style={s.primaryBtnText}>{copy.signIn}</Text>
            </PressableScale>
            <PressableScale style={s.secondaryBtn} onPress={() => nav.push('/(auth)/register')}>
              <Text style={s.secondaryBtnText}>{copy.createAccount}</Text>
            </PressableScale>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.profileHeader}>
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
              accessibilityLabel={copy.settingsLabel}
              items={[
                { key: 'edit', label: copy.editProfile, icon: 'create-outline', onPress: edit.open },
                { key: 'password', label: changePasswordCopy.row, icon: 'key-outline', onPress: () => setPasswordOpen(true) },
              ]}
            />
          </View>

          {loadError && (
            <View style={s.loadErrorCard}>
              <View style={s.offlineTitleRow}>
                <Ionicons name="warning-outline" size={18} color={Colors.danger} />
                <Text style={s.loadErrorTitle}>{copy.loadErrorTitle}</Text>
              </View>
              <Text style={s.loadErrorBody}>{copy.loadErrorBody}</Text>
              <TouchableOpacity style={s.errorDismissBtn} onPress={load} activeOpacity={0.8}>
                <Text style={s.errorDismissBtnText}>{copy.retry}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{decisionCount}</Text>
              <Text style={s.statLabel}>{copy.statsDecisions}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: Colors.amber }]}>{pendingCount}</Text>
              <Text style={s.statLabel}>Pending</Text>
            </View>
          </View>

          {!sync.connected && (
            <View style={s.offlineCard}>
              <Ionicons name="cloud-offline-outline" size={22} color={Colors.amber} />
              <View style={s.offlineInfo}>
                <Text style={[s.offlineTitle, { marginBottom: 3 }]}>{copy.offlineTitle}</Text>
                <Text style={s.offlineBody}>{copy.lastSync(formatSyncTime(sync.lastSyncedAt))}</Text>
              </View>
              <TouchableOpacity style={[s.syncBtn, isSyncing && s.syncBtnBusy]} onPress={handleSyncNow} disabled={isSyncing} activeOpacity={0.8}>
                <Ionicons name="sync-outline" size={15} color={Colors.amberText} />
                <Text style={s.syncBtnText}>{copy.syncNow}</Text>
              </TouchableOpacity>
            </View>
          )}

          {sync.recentErrors.length > 0 && (
            <View style={s.errorCard}>
              <View style={s.offlineTitleRow}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={s.errorTitle}>{copy.syncErrorsTitle}</Text>
              </View>
              <Text style={s.errorBody}>
                {copy.syncErrorsBody(sync.recentErrors.length)}
              </Text>
              <TouchableOpacity style={s.errorDismissBtn} onPress={handleDismissSyncErrors} activeOpacity={0.8}>
                <Text style={s.errorDismissBtnText}>{copy.syncErrorDismiss}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.listCard}>
            <View style={[s.listRow, s.listRowBorder, s.listRowTop]}>
              <Ionicons name="mail-outline" size={20} color={Colors.ink} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.emailRow}>
                  <Text style={s.listRowLabel}>Email</Text>
                  <Text style={[s.listRowValue, s.emailValue]} numberOfLines={1}>{displayEmail(user.email)}</Text>
                </View>
                {!realEmail(user.email) && !edit.pendingEmail && (
                  <Text style={s.pendingEmail}>{copy.noEmailHint}</Text>
                )}
                {edit.pendingEmail && (
                  <Text style={s.pendingEmail}>{copy.pendingEmail(edit.pendingEmail)}</Text>
                )}
              </View>
            </View>
            {locations.length > 0 && (
              <View style={[s.listRow, s.listRowBorder]}>
                <Ionicons name="location-outline" size={20} color={Colors.ink} />
                <Text style={[s.listRowLabel, { marginLeft: 12 }]}>{copy.location}</Text>
                <Text style={[s.listRowValue, s.emailValue]} numberOfLines={1}>{locations[0].city}, {locations[0].province}</Text>
              </View>
            )}
            <View style={[s.listRow, s.listRowBorder]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{copy.accountType}</Text>
              <Text style={s.listRowValue}>{ROLE_SHORT.farmer}</Text>
            </View>
            <PressableScale style={[s.listRow, s.listRowBorder]} onPress={() => nav.push('/about')} accessibilityRole="button">
              <Ionicons name="information-circle-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{copy.about}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkFaint} />
            </PressableScale>
            <PressableScale style={[s.listRow, s.listRowBorder]} onPress={() => nav.push('/help')} accessibilityRole="button">
              <Ionicons name="help-circle-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{helpCopy.openHelp}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkFaint} />
            </PressableScale>
            <PressableScale style={[s.listRow, s.listRowBorder]} onPress={() => nav.push('/onboarding?replay=1')} accessibilityRole="button">
              <Ionicons name="book-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{copy.viewIntro}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkFaint} />
            </PressableScale>
            <PressableScale style={s.listRow} onPress={() => nav.push('/terms')} accessibilityRole="button">
              <Ionicons name="document-text-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{termsCopy.profileRow}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkFaint} />
            </PressableScale>
          </View>

          <TouchableOpacity onPress={handleLogout} style={s.logoutRow}>
            <Text style={s.logoutText}>{copy.logOut}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <EditProfileSheet
        visible={edit.isOpen}
        online={sync.connected}
        pendingEmail={edit.pendingEmail}
        onClose={edit.close}
        onSaved={edit.onSaved}
      />
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
  safe: { flex: 1, backgroundColor: Colors.bg },

  signedOutScreen: { flex: 1 },
  signedOutTop: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  topIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // Buttons are capped and centred so they stay off the screen edges on a tablet.
  signedOutWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 48 },
  signedOutTitle: { fontSize: 24, fontWeight: '800', color: Colors.ink, marginBottom: 10, textAlign: 'center' },
  signedOutSubtitle: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  signedOutLogo: { width: 84, height: 84, alignSelf: 'center', marginBottom: 16 },
  primaryBtn: { experimental_backgroundImage: brandGradientCss(90), borderRadius: 14, paddingVertical: 16, width: '100%', maxWidth: 420, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: 14, paddingVertical: 16, width: '100%', maxWidth: 420, alignItems: 'center' },
  secondaryBtnText: { color: Colors.ink, fontWeight: '700', fontSize: 15 },

  content: { ...contentColumn, padding: 22, paddingTop: 12, paddingBottom: 40 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 22 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 23, fontWeight: '800', color: Colors.accentTintStrong },
  name: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3 },
  username: { fontSize: 14, color: Colors.inkSoft, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  statCard: { flex: 1, ...cardSurface, padding: CARD_PADDING },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  statLabel: { fontSize: 12, color: Colors.inkFaint, marginTop: 2 },

  offlineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.amberBg, borderRadius: CARD_RADIUS, padding: CARD_PADDING, marginBottom: 20 },
  offlineInfo: { flex: 1 },
  offlineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  offlineTitle: { fontSize: 15, fontWeight: '800', color: Colors.amberText, flexShrink: 1 },
  offlineBody: { fontSize: 13, color: Colors.amberDeepText },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 10, height: 34, paddingHorizontal: 12 },
  syncBtnBusy: { opacity: 0.6 },
  syncBtnText: { fontSize: 13, fontWeight: '700', color: Colors.amberText },

  errorCard: { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: CARD_RADIUS, padding: CARD_PADDING, marginBottom: 20 },
  errorTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger },
  errorBody: { fontSize: 13.5, color: Colors.dangerText, lineHeight: 19, marginBottom: 12 },
  errorDismissBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: 11, height: 40 },
  errorDismissBtnText: { fontSize: 13, fontWeight: '700', color: Colors.danger },

  loadErrorCard: { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder, borderRadius: CARD_RADIUS, padding: CARD_PADDING, marginBottom: 20 },
  loadErrorTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger },
  loadErrorBody: { fontSize: 13.5, color: Colors.dangerText, lineHeight: 19, marginBottom: 12 },

  listCard: { ...cardSurface, marginBottom: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  listRowLabel: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  listRowValue: { fontSize: 14, color: Colors.inkFaint },
  listRowTop: { alignItems: 'flex-start' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emailValue: { flex: 1, textAlign: 'right' },
  pendingEmail: { fontSize: 12.5, color: Colors.amberText, marginTop: 6, lineHeight: 17 },

  logoutRow: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
});
