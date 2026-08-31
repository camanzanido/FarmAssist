import { useAuth } from '@/src/auth/AuthContext';
import { ResearcherColors as C } from '@/src/constants/colors';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function ResearcherProfileScreen() {
  const { user, signOut } = useAuth();
  const sync = useSyncStatus();

  function handleLogout() {
    Alert.alert('Log out?', 'You will need to sign in again to access researcher tools.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
          <View style={[s.row, s.rowBorder]}>
            <Ionicons name="mail-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>Email</Text>
            <Text style={s.rowValue}>{user.email}</Text>
          </View>
          <View style={[s.row, s.rowBorder]}>
            <Ionicons name="shield-checkmark-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>Account type</Text>
            <Text style={s.rowValue}>Researcher</Text>
          </View>
          <View style={s.row}>
            <Ionicons name="cloud-outline" size={19} color={C.textSoft} />
            <Text style={[s.rowLabel, { flex: 1, marginLeft: 12 }]}>Sync status</Text>
            <Text style={s.rowValue}>{sync.connected ? 'Connected' : 'Offline'}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.logoutRow} activeOpacity={0.8}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 12, paddingBottom: 40 },

  header: { marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textFaint, marginBottom: 5 },
  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 22 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '800', color: C.accentDeepText },
  name: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  username: { fontSize: 13.5, color: C.textSoft, marginTop: 2 },

  card: { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: C.text },
  rowValue: { fontSize: 13.5, color: C.textSoft, maxWidth: '45%', textAlign: 'right' },

  logoutRow: { alignItems: 'center', paddingVertical: 10 },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.danger },
});
