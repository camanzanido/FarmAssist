import { useAuth } from '@/src/auth/AuthContext';
import { DECISIONS } from '@/src/constants';
import { Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { homeCopy as copy } from '@/src/constants/copy';
import { getDecisionsByUser, type Decision } from '@/src/database/repositories/decisions';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected } = useSyncStatus();
  const userId = user?.id ?? '';

  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLastDecision(null);
      setLoadError(false);
      return;
    }
    try {
      const rows = await getDecisionsByUser(userId);
      setLastDecision(rows[0] ?? null);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load last decision:', err);
      setLoadError(true);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goToDecision = (decisionType: string) => {
    router.push({ pathname: '/input-flow', params: { decisionType } });
  };

  const isOffline = !!user && !connected;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(user?.name ?? 'Guest')}</Text>
            </View>
            <Text style={s.greeting}>{copy.greeting(user?.name?.split(' ')[0] ?? 'there')}</Text>
          </View>
          {isOffline && (
            <View style={s.offlinePill}>
              <View style={s.offlineDot} />
              <Text style={s.offlinePillText}>{copy.offlinePill}</Text>
            </View>
          )}
        </View>

        <Text style={s.heading}>{copy.heading}</Text>
        <Text style={s.subtitle}>{copy.subtitle}</Text>

        {loadError && (
          <View style={s.loadErrorBanner}>
            <Ionicons name="warning-outline" size={16} color={Colors.danger} />
            <Text style={s.loadErrorText}>{copy.loadErrorTitle}</Text>
            <TouchableOpacity onPress={load} hitSlop={8}>
              <Text style={s.loadErrorRetry}>{copy.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.decisionList}>
          {DECISIONS.map(d => (
            <TouchableOpacity key={d.id} style={s.decisionRow} activeOpacity={0.75} onPress={() => goToDecision(d.id)}>
              <View style={s.decisionIconWrap}>
                <Ionicons name={d.icon} size={25} color={Colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.decisionLabel}>{d.label}</Text>
                <Text style={s.decisionDesc} numberOfLines={1}>{d.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.ink} style={{ opacity: 0.3 }} />
            </TouchableOpacity>
          ))}
        </View>

        {lastDecision && (
          <View style={s.lastDecisionBlock}>
            <Text style={s.lastDecisionHeading}>{copy.lastDecisionHeading}</Text>
            <View style={s.lastDecisionCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.lastDecisionResult} numberOfLines={1}>{lastDecision.result}</Text>
                <Text style={s.lastDecisionMeta}>{formatDate(lastDecision.datetime)} · saved on this phone</Text>
              </View>
              <Text style={s.lastDecisionProfit}>+{formatCurrency(lastDecision.profit_increase)}</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  content: { ...contentColumn, padding: 22, paddingTop: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  greeting: { fontSize: 15, fontWeight: '600', color: '#C8DFD0' },
  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  offlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.amber },
  offlinePillText: { fontSize: 12, fontWeight: '600', color: '#E0C68F' },

  heading: { fontSize: 32, fontWeight: '800', color: Colors.onDark, lineHeight: 38, letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.onDarkFaint, marginBottom: 24 },

  loadErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.onDarkCard, borderRadius: 12, padding: 12, marginBottom: 18 },
  loadErrorText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: Colors.onDarkSoft },
  loadErrorRetry: { fontSize: 12.5, fontWeight: '700', color: Colors.onDark },

  decisionList: { gap: 11, marginBottom: 24 },
  decisionRow: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  decisionIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  decisionLabel: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  decisionDesc: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },

  lastDecisionBlock: { borderTopWidth: 1, borderTopColor: Colors.onDarkDivider, paddingTop: 18 },
  lastDecisionHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: Colors.onDarkFaint, marginBottom: 11 },
  lastDecisionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.onDarkCard, borderRadius: 14, padding: 14 },
  lastDecisionResult: { fontSize: 15, fontWeight: '700', color: Colors.onDark },
  lastDecisionMeta: { fontSize: 13, color: Colors.onDarkFaint, marginTop: 2 },
  lastDecisionProfit: { fontSize: 15, fontWeight: '800', color: Colors.onDarkSoft },
});
