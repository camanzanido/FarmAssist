import { DECISION_LABELS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import { getAllDecisions, type Decision } from '@/src/database/repositories/decisions';
import { getAllUsers, type User } from '@/src/database/repositories/users';
import { useSyncStatus } from '@/src/hooks/use-sync-status';
import { formatCurrency } from '@/src/utils/formatters';
import { median, monthKeyOf, monthsBack } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatSyncTime(date: Date | null): string {
  if (!date) return 'not yet synced';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ResearcherDashboardScreen() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sync = useSyncStatus();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [d, u] = await Promise.all([getAllDecisions(), getAllUsers()]);
      setDecisions(d);
      setUsers(u);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthDecisions = decisions.filter(d => {
      const dt = new Date(d.datetime);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;

    const activeFarmerIds = new Set(decisions.map(d => d.user_id).filter(Boolean));
    const newFarmersThisMonth = users.filter(u => {
      if (u.user_type !== 'farmer') return false;
      const created = new Date(u.created_at);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    }).length;

    const medianGain = median(decisions.map(d => d.profit_increase));

    const months = monthsBack(6);
    const perMonth = months.map(m => ({
      ...m,
      count: decisions.filter(d => monthKeyOf(d.datetime) === m.key).length,
    }));
    const maxMonthCount = Math.max(...perMonth.map(m => m.count), 1);

    return {
      total: decisions.length,
      thisMonthDecisions,
      activeFarmers: activeFarmerIds.size,
      newFarmersThisMonth,
      medianGain,
      perMonth,
      maxMonthCount,
      recent: decisions.slice(0, 3),
    };
  }, [decisions, users]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {isLoading ? (
        <View style={s.centerWrap}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>RESEARCHER</Text>
              <Text style={s.title}>Overview</Text>
            </View>
          </View>

          {!sync.connected && (
            <View style={s.offlineRow}>
              <Ionicons name="cloud-offline-outline" size={17} color={C.amber} />
              <Text style={s.offlineText}>
                Showing data as of <Text style={s.offlineStrong}>{formatSyncTime(sync.lastSyncedAt)}</Text>
                {sync.pendingCount > 0 ? ` · ${sync.pendingCount} records pending upload` : ''}
              </Text>
            </View>
          )}

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{stats.total.toLocaleString()}</Text>
              <Text style={s.statLabel}>Decisions</Text>
              <Text style={s.statDelta}>+{stats.thisMonthDecisions} this month</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{stats.activeFarmers.toLocaleString()}</Text>
              <Text style={s.statLabel}>Active farmers</Text>
              <Text style={s.statDelta}>+{stats.newFarmersThisMonth} this month</Text>
            </View>
          </View>
          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: C.text }]}>{users.filter(u => u.user_type === 'researcher').length}</Text>
              <Text style={s.statLabel}>Researchers</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{formatCurrency(stats.medianGain)}</Text>
              <Text style={s.statLabel}>Median gain/ha</Text>
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHeadRow}>
              <Text style={s.cardTitle}>Decisions per month</Text>
              <Text style={s.cardHint}>Last 6</Text>
            </View>
            <View style={s.chartRow}>
              {stats.perMonth.map((m, i) => {
                const isLast = i === stats.perMonth.length - 1;
                const heightPct = Math.max((m.count / stats.maxMonthCount) * 100, m.count > 0 ? 8 : 2);
                return (
                  <View key={m.key} style={s.chartCol}>
                    <View style={[s.chartBar, { height: `${heightPct}%` }, isLast ? s.chartBarLast : s.chartBarDim]} />
                  </View>
                );
              })}
            </View>
            <View style={s.chartLabelRow}>
              {stats.perMonth.map((m, i) => (
                <Text key={m.key} style={[s.chartLabel, i === stats.perMonth.length - 1 && s.chartLabelActive]}>{m.label}</Text>
              ))}
            </View>
          </View>

          {stats.recent.length > 0 && (
            <>
              <View style={s.cardHeadRow}>
                <Text style={s.cardTitle}>Recent decisions</Text>
              </View>
              {stats.recent.map(d => (
                <View key={d.id} style={s.recentRow}>
                  <View style={s.recentAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentResult}>{d.result}</Text>
                    <Text style={s.recentMeta}>
                      {DECISION_LABELS[d.decision_type as DecisionType] ?? d.decision_type} · +{formatCurrency(d.profit_increase)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 12, paddingBottom: 20 },

  header: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textFaint, marginBottom: 5 },
  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberBorder, borderRadius: 11, padding: 11, marginBottom: 18 },
  offlineText: { flex: 1, fontSize: 12.5, color: C.amberText, lineHeight: 17 },
  offlineStrong: { color: '#F0DDB0', fontWeight: '700' },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12.5, color: C.textSoft, marginTop: 3 },
  statDelta: { fontSize: 11.5, fontWeight: '700', color: C.accent, marginTop: 7 },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginTop: 10, marginBottom: 18 },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: C.text },
  cardHint: { fontSize: 12, color: C.textFaint },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 110 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 5 },
  chartBarDim: { backgroundColor: 'rgba(168,212,180,0.35)' },
  chartBarLast: { backgroundColor: C.accent },
  chartLabelRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, color: C.textFaint },
  chartLabelActive: { fontWeight: '700', color: C.accent },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  recentAccent: { width: 8, height: 38, borderRadius: 4, backgroundColor: C.accent },
  recentResult: { fontSize: 14.5, fontWeight: '700', color: C.text },
  recentMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 2 },
});
