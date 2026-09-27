import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { ExportSheet } from '@/src/components/researcher/export-sheet';
import { DECISIONS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import { useIsWide, wideColumn } from '@/src/constants/layout';
import { type Decision } from '@/src/database/repositories/decisions';
import { type Location } from '@/src/database/repositories/locations';
import { fetchAllDecisions, fetchAllLocations, fetchAllUsers } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { median, monthKeyOf, monthsBack } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_COLORS: Record<DecisionType, string> = {
  crop_choice: '#7FD69E',
  harvest: '#4E9B77',
  protect: '#2F6B52',
};

type Range = 'season' | 'year' | 'all';

const EMPTY = { decisions: [] as Decision[], users: [] as User[], locations: [] as Location[] };

export default function ResearcherDashboardScreen() {
  const [range, setRange] = useState<Range>('season');
  const [exportOpen, setExportOpen] = useState(false);
  const isWide = useIsWide();

  const fetchOverview = useCallback(async () => {
    const [decisions, users, locations] = await Promise.all([
      fetchAllDecisions(),
      fetchAllUsers(),
      fetchAllLocations(),
    ]);
    return { decisions, users, locations };
  }, []);
  const { data: { decisions, users, locations }, isLoading, error, reload } = useResearcherFetch(fetchOverview, EMPTY);

  const rangeFiltered = useMemo(() => {
    if (range === 'all') return decisions;
    const now = new Date();
    const cutoff = new Date(now);
    if (range === 'season') cutoff.setMonth(now.getMonth() - 3);
    else cutoff.setFullYear(now.getFullYear() - 1);
    return decisions.filter(d => new Date(d.datetime) >= cutoff);
  }, [decisions, range]);

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

    return {
      total: decisions.length,
      thisMonthDecisions,
      activeFarmers: activeFarmerIds.size,
      newFarmersThisMonth,
      medianGain,
    };
  }, [decisions, users]);

  const monthlyCounts = useMemo(() => {
    const months = monthsBack(6);
    const perMonth = months.map(m => ({
      ...m,
      count: rangeFiltered.filter(d => monthKeyOf(d.datetime) === m.key).length,
    }));
    const max = Math.max(...perMonth.map(m => m.count), 1);
    return { perMonth, max };
  }, [rangeFiltered]);

  const typeBreakdown = useMemo(() => {
    const total = rangeFiltered.length || 1;
    return DECISIONS.map(d => {
      const count = rangeFiltered.filter(r => r.decision_type === d.id).length;
      return { id: d.id, label: d.label, count, pct: Math.round((count / total) * 100) };
    });
  }, [rangeFiltered]);

  const topMunicipalities = useMemo(() => {
    const locById = new Map(locations.map(l => [l.id, l]));
    const counts = new Map<string, number>();
    for (const d of rangeFiltered) {
      const city = locById.get(d.location_id)?.city;
      if (!city) continue;
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([city, count]) => ({ city, count }));
    arr.sort((a, b) => b.count - a.count);
    const max = arr[0]?.count ?? 1;
    return arr.slice(0, 4).map(r => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }, [rangeFiltered, locations]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load the overview. Check your connection."
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>RESEARCHER</Text>
              <Text style={s.title}>Overview</Text>
            </View>
          </View>

          <View style={isWide && s.statGridWide}>
            <View style={[s.statRow, isWide && s.statRowWide]}>
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
            <View style={[s.statRow, isWide && s.statRowWide]}>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: C.text }]}>{users.filter(u => u.user_type === 'researcher').length}</Text>
                <Text style={s.statLabel}>Researchers</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{formatCurrency(stats.medianGain)}</Text>
                <Text style={s.statLabel}>Median gain/ha</Text>
              </View>
            </View>
          </View>

          <View style={s.rangeRow}>
            {(['season', 'year', 'all'] as Range[]).map(r => (
              <TouchableOpacity key={r} style={[s.rangeChip, range === r && s.rangeChipActive]} onPress={() => setRange(r)}>
                <Text style={[s.rangeChipText, range === r && s.rangeChipTextActive]}>
                  {r === 'season' ? 'This season' : r === 'year' ? 'Year' : 'All time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.card}>
            <View style={s.cardHeadRow}>
              <Text style={s.cardTitle}>Decisions per month</Text>
              <Text style={s.cardHint}>Last 6</Text>
            </View>
            <View style={s.chartRow}>
              {monthlyCounts.perMonth.map((m, i) => {
                const isLast = i === monthlyCounts.perMonth.length - 1;
                const heightPct = Math.max((m.count / monthlyCounts.max) * 100, m.count > 0 ? 8 : 2);
                return (
                  <View key={m.key} style={s.chartCol}>
                    <View style={[s.chartBar, { height: `${heightPct}%` }, isLast ? s.chartBarLast : s.chartBarDim]} />
                  </View>
                );
              })}
            </View>
            <View style={s.chartLabelRow}>
              {monthlyCounts.perMonth.map((m, i) => (
                <Text key={m.key} style={[s.chartLabel, i === monthlyCounts.perMonth.length - 1 && s.chartLabelActive]}>{m.label}</Text>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Decision types</Text>
            <Text style={s.cardHint}>{rangeFiltered.length} total</Text>
            <View style={s.stackedBar}>
              {typeBreakdown.map(t => (
                <View key={t.id} style={{ width: `${t.pct}%`, backgroundColor: TYPE_COLORS[t.id], height: '100%' }} />
              ))}
            </View>
            <View style={{ gap: 9, marginTop: 4 }}>
              {typeBreakdown.map(t => (
                <View key={t.id} style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: TYPE_COLORS[t.id] }]} />
                  <Text style={s.legendLabel}>{t.label}</Text>
                  <Text style={s.legendCount}>{t.count}</Text>
                  <Text style={s.legendPct}>{t.pct}%</Text>
                </View>
              ))}
            </View>
          </View>

          {topMunicipalities.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Top municipalities</Text>
              <View style={{ gap: 12, marginTop: 14 }}>
                {topMunicipalities.map(m => (
                  <View key={m.city}>
                    <View style={s.muniTopRow}>
                      <Text style={s.muniLabel}>{m.city}</Text>
                      <Text style={s.muniCount}>{m.count}</Text>
                    </View>
                    <View style={s.muniBarBg}>
                      <View style={[s.muniBarFill, { width: `${m.pct}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.exportRow}>
            <TouchableOpacity style={s.exportBtn} onPress={() => setExportOpen(true)} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={18} color={C.accentDeepText} />
              <Text style={s.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </ResearcherAsyncState>

      <ExportSheet
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        decisions={rangeFiltered}
        users={users}
        locations={locations}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },

  header: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.textFaint, marginBottom: 5 },
  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statGridWide: { flexDirection: 'row', gap: 10 },
  statRowWide: { flex: 1 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12.5, color: C.textSoft, marginTop: 3 },
  statDelta: { fontSize: 11.5, fontWeight: '700', color: C.accent, marginTop: 7 },

  rangeRow: { flexDirection: 'row', gap: 7, marginTop: 8, marginBottom: 4 },
  rangeChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  rangeChipActive: { backgroundColor: C.accentStrong },
  rangeChipText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  rangeChipTextActive: { color: C.accentDeepText, fontWeight: '700' },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginTop: 14, marginBottom: 4 },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: C.text, marginBottom: 3 },
  cardHint: { fontSize: 12, color: C.textFaint, marginBottom: 16 },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 110 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 5 },
  chartBarDim: { backgroundColor: 'rgba(168,212,180,0.35)' },
  chartBarLast: { backgroundColor: C.accent },
  chartLabelRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, color: C.textFaint },
  chartLabelActive: { fontWeight: '700', color: C.accent },

  stackedBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 13.5, color: '#C8DFD0' },
  legendCount: { fontSize: 13.5, fontWeight: '700', color: C.text },
  legendPct: { fontSize: 12, color: C.textFaint, width: 38, textAlign: 'right' },

  muniTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  muniLabel: { fontSize: 13.5, color: '#C8DFD0' },
  muniCount: { fontSize: 13, fontWeight: '700', color: C.text },
  muniBarBg: { height: 7, backgroundColor: C.divider, borderRadius: 4, overflow: 'hidden' },
  muniBarFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },

  exportRow: { marginTop: 10 },
  exportBtn: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 14, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { fontSize: 14.5, fontWeight: '800', color: C.accentDeepText },
});
