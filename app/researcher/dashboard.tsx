import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { ExportSheet } from '@/src/components/researcher/export-sheet';
import { ChartCardsSkeleton, OverviewSkeleton } from '@/src/components/researcher/skeletons';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { DonutChart } from '@/src/components/ui/donut-chart';
import { OdometerText } from '@/src/components/ui/odometer-text';
import { DECISIONS, DecisionType } from '@/src/constants';
import { CARD_PADDING, cardSurface, Colors, DecisionTypeColors } from '@/src/constants/colors';
import { useIsWide, wideColumn } from '@/src/constants/layout';
import { fetchOverview, type Overview } from '@/src/database/repositories/researcher';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { monthsBack } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_COLORS = DecisionTypeColors as Record<DecisionType, string>;

// Below this width the types and municipalities columns stack instead of sharing a row.
const SPLIT_MIN_WIDTH = 400;

type Range = 'season' | 'year' | 'all';

const INK = [Colors.ink] as const;
const ACCENT = [Colors.accent] as const;

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'season', label: 'This season' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All time' },
];

function rangeStart(range: Range): Date | null {
  if (range === 'all') return null;
  const cutoff = new Date();
  if (range === 'season') cutoff.setMonth(cutoff.getMonth() - 3);
  else cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff;
}

const EMPTY: Overview = {
  total: 0, this_month: 0, active_farmers: 0, new_farmers_this_month: 0, researchers: 0,
  median_gain: 0, average_gain: 0, range_total: 0, per_month: [], by_type: [], top_cities: [],
};

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export default function ResearcherDashboardScreen() {
  const [range, setRange] = useState<Range>('season');
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const isWide = useIsWide();
  const splitRow = useWindowDimensions().width >= SPLIT_MIN_WIDTH;

  const fetchForRange = useCallback(() => fetchOverview(rangeStart(range)), [range]);
  const { data: overview, isLoading, isRefreshing, error, reload, refresh } = useResearcherFetch(fetchForRange, EMPTY);

  const isFirstRange = useRef(true);
  useEffect(() => {
    if (isFirstRange.current) {
      isFirstRange.current = false;
      return;
    }
    let cancelled = false;
    setIsRangeLoading(true);
    reload().finally(() => { if (!cancelled) setIsRangeLoading(false); });
    return () => { cancelled = true; };
  }, [range, reload]);

  const monthlyCounts = useMemo(() => {
    const counts = new Map(overview.per_month.map(m => [m.month, m.count]));
    const perMonth = monthsBack(6).map(m => ({ ...m, count: counts.get(monthKey(m.year, m.month)) ?? 0 }));
    const max = Math.max(...perMonth.map(m => m.count), 1);
    return { perMonth, max };
  }, [overview.per_month]);

  const typeBreakdown = useMemo(() => {
    const total = overview.range_total || 1;
    const counts = new Map(overview.by_type.map(t => [t.decision_type, t.count]));
    return DECISIONS.map(d => {
      const count = counts.get(d.id) ?? 0;
      return { id: d.id, label: d.label, count, pct: Math.round((count / total) * 100) };
    });
  }, [overview.by_type, overview.range_total]);

  const topMunicipalities = useMemo(() => {
    const max = overview.top_cities[0]?.count ?? 1;
    return overview.top_cities.map(r => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }, [overview.top_cities]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load the overview. Check your connection."
        skeleton={<OverviewSkeleton />}
      >
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.ink} colors={[Colors.accent]} />}
        >
          <View style={s.header}>
            <Text style={s.title}>Overview</Text>
            <TouchableOpacity
              style={s.exportBtn}
              onPress={() => setExportOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Export reports"
            >
              <Ionicons name="download-outline" size={16} color={Colors.ink} />
              <Text style={s.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>

          <View style={isWide && s.statGridWide}>
            <View style={[s.statRow, isWide && s.statRowWide]}>
              <View style={s.statCard}>
                <OdometerText text={overview.total.toLocaleString()} colors={INK} style={s.statValue} />
                <Text style={s.statLabel}>Decisions</Text>
                <Text style={s.statDelta}>+{overview.this_month} this month</Text>
              </View>
              <View style={s.statCard}>
                <OdometerText text={overview.active_farmers.toLocaleString()} colors={INK} style={s.statValue} />
                <Text style={s.statLabel}>Active farmers</Text>
                <Text style={s.statDelta}>+{overview.new_farmers_this_month} this month</Text>
              </View>
            </View>
            <View style={[s.statRow, isWide && s.statRowWide]}>
              <View style={s.statCard}>
                <OdometerText text={overview.researchers.toLocaleString()} colors={INK} style={s.statValue} />
                <Text style={s.statLabel}>Researchers</Text>
              </View>
              <View style={s.statCard}>
                <OdometerText text={formatCurrency(overview.average_gain)} colors={ACCENT} style={s.statValue} />
                <Text style={s.statLabel}>Average gain/ha</Text>
              </View>
            </View>
          </View>

          <View style={s.rangeRow}>
            <AnimatedFilterBar options={RANGE_OPTIONS} selected={range} onSelect={setRange} />
          </View>

          {isRangeLoading ? <ChartCardsSkeleton /> : (
            <>
              <View style={s.section}>
                <View style={s.sectionHeadRow}>
                  <Text style={s.sectionTitle}>Decisions per month</Text>
                  <Text style={s.sectionHint}>Last 6</Text>
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

              <View style={[s.section, splitRow && s.splitRow]}>
                <View style={splitRow ? s.typesCol : undefined}>
                  <Text style={s.sectionTitle}>Decision types</Text>
                  <Text style={s.sectionHint}>{overview.range_total} total</Text>
                  <View style={s.donutWrap}>
                    <DonutChart
                      segments={typeBreakdown.map(t => ({ key: t.id, value: t.count, color: TYPE_COLORS[t.id] }))}
                      centerValue={overview.range_total.toLocaleString()}
                      centerLabel="decisions"
                      accessibilityLabel={typeBreakdown.map(t => `${t.label} ${t.count}`).join(', ')}
                    />
                  </View>
                  <View style={{ gap: 9 }}>
                    {typeBreakdown.map(t => (
                      <View key={t.id} style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: TYPE_COLORS[t.id] }]} />
                        <Text style={s.legendLabel} numberOfLines={2}>{t.label}</Text>
                        <Text style={s.legendCount}>{t.count}</Text>
                        <Text style={s.legendPct}>{t.pct}%</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {topMunicipalities.length > 0 && (
                  <View style={splitRow ? s.muniCol : s.stackedMuni}>
                    <Text style={s.sectionTitle}>Top municipalities</Text>
                    <View style={{ gap: 12, marginTop: 14 }}>
                      {topMunicipalities.map(m => (
                        <View key={m.city}>
                          <View style={s.muniTopRow}>
                            <Text style={s.muniLabel} numberOfLines={1}>{m.city}</Text>
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
              </View>
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </ResearcherAsyncState>

      <ExportSheet visible={exportOpen} onClose={() => setExportOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  title: { fontSize: 27, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statGridWide: { flexDirection: 'row', gap: 10 },
  statRowWide: { flex: 1 },
  statCard: { flex: 1, ...cardSurface, padding: CARD_PADDING },
  statValue: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 12.5, color: Colors.inkSoft, marginTop: 3 },
  statDelta: { fontSize: 11.5, fontWeight: '700', color: Colors.accent, marginTop: 7 },

  rangeRow: { marginTop: 8, marginBottom: 4 },

  section: { ...cardSurface, padding: CARD_PADDING, marginTop: 12 },
  stackedMuni: { marginTop: 26 },
  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: Colors.ink, marginBottom: 3 },
  sectionHint: { fontSize: 12, color: Colors.inkFaint, marginBottom: 16 },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 110 },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 5 },
  chartBarDim: { backgroundColor: Colors.accentTintStrong },
  chartBarLast: { backgroundColor: Colors.accent },
  chartLabelRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, color: Colors.inkFaint },
  chartLabelActive: { fontWeight: '700', color: Colors.accent },

  // Municipalities get the wider share of the row.
  splitRow: { flexDirection: 'row', gap: 20 },
  typesCol: { flex: 2 },
  muniCol: { flex: 3 },
  donutWrap: { alignItems: 'center', marginBottom: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 13.5, color: Colors.inkMuted },
  legendCount: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },
  legendPct: { fontSize: 12, color: Colors.inkFaint, width: 34, textAlign: 'right' },

  muniTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  muniLabel: { flex: 1, fontSize: 13.5, color: Colors.inkMuted, marginRight: 8 },
  muniCount: { fontSize: 13, fontWeight: '700', color: Colors.ink },
  muniBarBg: { height: 7, backgroundColor: Colors.divider, borderRadius: 4, overflow: 'hidden' },
  muniBarFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },

  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: Colors.ink },
});
