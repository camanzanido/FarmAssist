import { useAuth } from '@/src/auth/AuthContext';
import { CARD_PADDING, cardSurface, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { displayEmail } from '@/src/utils/accountEmail';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLL_INTERVAL_MS = 30_000;

export default function PendingScreen() {
  const { user, refreshProfile, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const refreshRef = useRef(refreshProfile);
  refreshRef.current = refreshProfile;

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      await refreshRef.current();
    } catch (e) {
      console.warn('Could not refresh approval status:', e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { refreshRef.current().catch(() => {}); }, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshRef.current().catch(() => {});
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  if (user && user.status === 'active') {
    return <Redirect href={user.user_type === 'researcher' ? '/researcher/dashboard' : '/(tabs)'} />;
  }
  if (!user) return <Redirect href="/(tabs)" />;

  const isDeactivated = user.status === 'inactive';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.content}>
        <View style={[s.iconWrap, isDeactivated && s.iconWrapMuted]}>
          <Ionicons
            name={isDeactivated ? 'lock-closed-outline' : 'hourglass-outline'}
            size={34}
            color={isDeactivated ? Colors.danger : Colors.amber}
          />
        </View>

        <Text style={s.title}>
          {isDeactivated ? 'Account deactivated' : 'Waiting for approval'}
        </Text>

        <Text style={s.body}>
          {isDeactivated
            ? 'Your account has been deactivated, so researcher features are unavailable. Contact a researcher if you think this is a mistake.'
            : 'Your researcher account has been created. An existing researcher needs to approve it before you can review data or manage users.'}
        </Text>

        {!isDeactivated && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Signed in as</Text>
            <Text style={s.cardValue}>{user.name || user.username}</Text>
            <Text style={s.cardEmail}>{displayEmail(user.email)}</Text>
          </View>
        )}

        <TouchableOpacity style={s.primaryBtn} onPress={check} disabled={isChecking} activeOpacity={0.85}>
          {isChecking
            ? <ActivityIndicator color={Colors.onDark} />
            : <Text style={s.primaryBtnText}>Check again</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={signOut} activeOpacity={0.7}>
          <Text style={s.secondaryBtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { ...contentColumn, flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.amberBg, borderWidth: 1, borderColor: Colors.amberBorder,
    marginBottom: 22,
  },
  iconWrapMuted: { backgroundColor: Colors.dangerBg, borderColor: Colors.dangerBg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.ink, textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14.5, lineHeight: 21, color: Colors.inkSoft, textAlign: 'center', marginBottom: 26 },
  card: {
    ...cardSurface, padding: CARD_PADDING, marginBottom: 26,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: Colors.inkFaint, letterSpacing: 0.6, marginBottom: 5 },
  cardValue: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardEmail: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: Colors.onDark, fontSize: 15.5, fontWeight: '700' },
  secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryBtnText: { color: Colors.inkFaint, fontSize: 14.5, fontWeight: '600' },
});
