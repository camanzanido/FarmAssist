import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { ExportSheet } from '@/src/components/researcher/export-sheet';
import { DECISIONS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import { type Decision } from '@/src/database/repositories/decisions';
import { type Location } from '@/src/database/repositories/locations';
import { fetchAllDecisions, fetchAllLocations, fetchAllUsers } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
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

export default function ResearcherReportsScreen() {
  const [range, setRange] = useState<Range>('season');
  const [exportOpen, setExportOpen] = useState(false);

  const fetchReportsData = useCallback(async () => {
    const [decisions, users, locations] = await Promise.all([
      fetchAllDecisions(),
      fetchAllUsers(),
      fetchAllLocations(),
    ]);
    return { decisions, users, locations };
  }, []);
  const { data: { decisions, users, locations }, isLoading, error, reload } = useResearcherFetch(fetchReportsData, EMPTY);

  const rangeFiltered = useMemo(() => {
    if (range === 'all') return decisions;
    const now = new Date();
    const cutoff = new Date(now);
    if (range === 'season') cutoff.setMonth(now.getMonth() - 3);
    else cutoff.setFullYear(now.getFullYear() - 1);
    return decisions.filter(d => new Date(d.datetime) >= cutoff);
  }, [decisions, range]);

  const typeBreakdown = useMemo(() => {
    const total = rangeFiltered.length || 1;
    return DECISIONS.map(d => {
      const count = rangeFiltered.filter(r => r.decision_type === d.id).length;
      return { id: d.id, label: d.label, count, pct: Math.round((count / total) * 100) };
    });
  }, [rangeFiltered]);

  const monthlyGain = useMemo(() => {
    const months = monthsBack(7);
    const perMonth = months.map(m => {
      const inMonth = rangeFiltered.filter(d => monthKeyOf(d.datetime) === m.key);
      return { ...m, median: median(inMonth.map(d => d.profit_increase)) };
    });
    const max = Math.max(...perMonth.map(m => m.median), 1);
    return { perMonth, max };
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
        errorMessage="Couldn't load reports. Check your connection."
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Reports</Text>

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

          <View style={s.card}>
            <Text style={s.cardTitle}>Median gain per hectare</Text>
            <Text style={s.cardHint}>By month, ₱</Text>
            <View style={s.chartRow}>
              {monthlyGain.perMonth.map((m, i) => {
                const isLast = i === monthlyGain.perMonth.length - 1;
                const heightPct = Math.max((m.median / monthlyGain.max) * 100, m.median > 0 ? 6 : 2);
                return (
                  <View key={m.key} style={s.chartCol}>
                    <View style={[s.chartBar, { height: `${heightPct}%` }, isLast ? s.chartBarLast : s.chartBarDim]} />
                  </View>
                );
              })}
            </View>
            <View style={s.chartLabelRow}>
              {monthlyGain.perMonth.map((m, i) => (
                <Text key={m.key} style={[s.chartLabel, i === monthlyGain.perMonth.length - 1 && s.chartLabelActive]}>{m.label[0]}</Text>
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
  content: { padding: 20, paddingTop: 12, paddingBottom: 20 },

  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 14 },

  rangeRow: { flexDirection: 'row', gap: 7, marginBottom: 18 },
  rangeChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  rangeChipActive: { backgroundColor: C.accentStrong },
  rangeChipText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  rangeChipTextActive: { color: C.accentDeepText, fontWeight: '700' },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: C.text, marginBottom: 3 },
  cardHint: { fontSize: 12, color: C.textFaint, marginBottom: 16 },

  stackedBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 13.5, color: '#C8DFD0' },
  legendCount: { fontSize: 13.5, fontWeight: '700', color: C.text },
  legendPct: { fontSize: 12, color: C.textFaint, width: 38, textAlign: 'right' },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 110 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 4 },
  chartBarDim: { backgroundColor: 'rgba(168,212,180,0.3)' },
  chartBarLast: { backgroundColor: C.accent },
  chartLabelRow: { flexDirection: 'row', gap: 7, marginTop: 9 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: C.textFaint },
  chartLabelActive: { fontWeight: '700', color: C.accent },

  muniTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  muniLabel: { fontSize: 13.5, color: '#C8DFD0' },
  muniCount: { fontSize: 13, fontWeight: '700', color: C.text },
  muniBarBg: { height: 7, backgroundColor: C.divider, borderRadius: 4, overflow: 'hidden' },
  muniBarFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },

  exportRow: { marginTop: 6 },
  exportBtn: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 14, backgroundColor: C.accentStrong, alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { fontSize: 14.5, fontWeight: '800', color: C.accentDeepText },
});
