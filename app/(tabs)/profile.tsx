// app/(tabs)/profile.tsx
import { connectSync } from '@/src/auth/authService';
import { useAuth } from '@/src/auth/AuthContext';
import { Colors } from '@/src/constants/colors';
import { profileCopy as copy } from '@/src/constants/copy';
import { getDecisionsByUser } from '@/src/database/repositories/decisions';
import { getLocationsByUser, type Location } from '@/src/database/repositories/locations';
import { clearSyncErrors } from '@/src/database/repositories/syncErrors';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/src/database/powersync/powersync';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const router = useRouter();
  const isAuthenticated = !!user;
  const sync = useSyncStatus();

  const [decisionCount, setDecisionCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [decisions, locs, batch] = await Promise.all([
        getDecisionsByUser(user.id),
        getLocationsByUser(user.id),
        db.getCrudBatch(1000),
      ]);
      setDecisionCount(decisions.length);
      setLocations(locs);
      setPendingCount((batch?.crud ?? []).filter(e => e.table === 'decisions').length);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setLoadError(true);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleLogout() {
    Alert.alert(copy.logoutConfirmTitle, copy.logoutConfirmBody, [
      { text: copy.logoutCancel, style: 'cancel' },
      { text: copy.logOut, style: 'destructive', onPress: () => signOut() },
    ]);
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
        <View style={s.signedOutWrap}>
          <Text style={s.signedOutTitle}>{copy.signedOutTitle}</Text>
          <Text style={s.signedOutSubtitle}>{copy.signedOutSubtitle}</Text>

          <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{copy.signIn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>{copy.createAccount}</Text>
          </TouchableOpacity>
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
              <View style={s.offlineTitleRow}>
                <View style={s.offlineDot} />
                <Text style={s.offlineTitle}>{copy.offlineTitle}</Text>
              </View>
              <Text style={s.offlineBody}>
                {copy.offlineBody(pendingCount, formatSyncTime(sync.lastSyncedAt))}
              </Text>
              <TouchableOpacity style={s.syncBtn} onPress={handleSyncNow} disabled={isSyncing} activeOpacity={0.8}>
                <Ionicons name="sync-outline" size={17} color={Colors.amberText} />
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

          {locations.length > 0 && (
            <>
              <Text style={s.sectionHeading}>MY LOCATION</Text>
              <View style={s.listCard}>
                <View style={s.listRow}>
                  <View style={s.listRowIconWrap}>
                    <Ionicons name="location-outline" size={19} color={Colors.ink} />
                  </View>
                  <Text style={s.listRowLabel}>{locations[0].city}, {locations[0].province}</Text>
                </View>
              </View>
            </>
          )}

          <View style={s.listCard}>
            <View style={s.listRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.ink} />
              <Text style={[s.listRowLabel, { flex: 1, marginLeft: 12 }]}>{copy.accountType}</Text>
              <Text style={s.listRowValue}>Farmer</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogout} style={s.logoutRow}>
            <Text style={s.logoutText}>{copy.logOut}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  signedOutWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  signedOutTitle: { fontSize: 24, fontWeight: '800', color: Colors.ink, marginBottom: 10, textAlign: 'center' },
  signedOutSubtitle: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  primaryBtn: { backgroundColor: Colors.ink, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center' },
  secondaryBtnText: { color: Colors.ink, fontWeight: '700', fontSize: 15 },

  content: { padding: 22, paddingTop: 12, paddingBottom: 40 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 22 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 23, fontWeight: '800', color: Colors.accentTintStrong },
  name: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3 },
  username: { fontSize: 14, color: Colors.inkSoft, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  statLabel: { fontSize: 12, color: Colors.inkFaint, marginTop: 2 },

  offlineCard: { backgroundColor: Colors.amberBg, borderWidth: 1, borderColor: Colors.amberBorder, borderRadius: 16, padding: 16, marginBottom: 20 },
  offlineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  offlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.amber },
  offlineTitle: { fontSize: 15, fontWeight: '800', color: Colors.amberText },
  offlineBody: { fontSize: 13.5, color: '#8A6B2E', lineHeight: 19, marginBottom: 12 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2CFA8', borderRadius: 11, height: 44 },
  syncBtnText: { fontSize: 14, fontWeight: '700', color: Colors.amberText },

  errorCard: { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: '#EFC6C0', borderRadius: 16, padding: 16, marginBottom: 20 },
  errorTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger },
  errorBody: { fontSize: 13.5, color: '#8A3A30', lineHeight: 19, marginBottom: 12 },
  errorDismissBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#EFC6C0', borderRadius: 11, height: 40 },
  errorDismissBtnText: { fontSize: 13, fontWeight: '700', color: Colors.danger },

  loadErrorCard: { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: '#EFC6C0', borderRadius: 16, padding: 16, marginBottom: 20 },
  loadErrorTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger },
  loadErrorBody: { fontSize: 13.5, color: '#8A3A30', lineHeight: 19, marginBottom: 12 },

  sectionHeading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.9, color: Colors.inkFaint, marginBottom: 10 },
  listCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  listRowIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  listRowLabel: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  listRowValue: { fontSize: 14, color: Colors.inkFaint },

  logoutRow: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
});
