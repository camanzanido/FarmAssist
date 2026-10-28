import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { ExportSheet } from '@/src/components/researcher/export-sheet';
import { LocationFilterSheet } from '@/src/components/researcher/location-filter-sheet';
import { ChartCardsSkeleton, OverviewSkeleton } from '@/src/components/researcher/skeletons';
import { StatCard } from '@/src/components/researcher/stat-card';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { AreaLineChart, type ChartSlot } from '@/src/components/ui/area-line-chart';
import { DonutChart } from '@/src/components/ui/donut-chart';
import { GradientBar } from '@/src/components/ui/gradient-bar';
import { Skeleton } from '@/src/components/ui/skeleton';
import { DECISIONS, DecisionType } from '@/src/constants';
import { CARD_PADDING, cardSurface, Colors, DecisionTypeColors } from '@/src/constants/colors';
import { useIsWide, wideColumn } from '@/src/constants/layout';
import { fetchMonthlyCounts, fetchOverview, type MonthlyCounts, type Overview, type Place } from '@/src/database/repositories/researcher';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { formatCurrency } from '@/src/utils/formatters';
import { placesLabel } from '@/src/utils/placeFilter';
import { monthsBack } from '@/src/utils/researcherStats';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_COLORS = DecisionTypeColors as Record<DecisionType, string>;

type Range = '3m' | 'year' | 'all';

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All time' },
];

const RANGE_MONTHS: Record<Exclude<Range, 'all'>, number> = { '3m': 3, year: 12 };

// Ranges start on the 1st of a month so the donut, municipalities and line chart cover the same months.
function rangeStart(range: Range): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (RANGE_MONTHS[range] - 1), 1);
}

// The line chart shows the range's months, or one calendar year for All time.
function chartWindow(range: Range, year: number): { from: { year: number; month: number }; months: number } {
  if (range === 'all') return { from: { year, month: 0 }, months: 12 };
  const start = rangeStart(range)!;
  return { from: { year: start.getFullYear(), month: start.getMonth() }, months: RANGE_MONTHS[range] };
}

const EMPTY: Overview = {
  total: 0, this_month: 0, active_farmers: 0, new_farmers_this_month: 0, researchers: 0,
  median_gain: 0, average_gain: 0, range_total: 0, per_month: [], by_type: [], top_cities: [],
};

const EMPTY_MONTHLY: MonthlyCounts = { firstMonth: null, months: [] };

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
const shortMonth = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });

export default function ResearcherDashboardScreen() {
  const [range, setRange] = useState<Range>('3m');
  const currentYear = new Date().getFullYear();
  const [chartYear, setChartYear] = useState(currentYear);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [locationOpen, setLocationOpen] = useState(false);
  const isWide = useIsWide();

  const fetchForRange = useCallback(() => fetchOverview(rangeStart(range), places), [range, places]);
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
  }, [range, places, reload]);

  const win = useMemo(() => chartWindow(range, chartYear), [range, chartYear]);
  const fetchMonthly = useCallback(() => fetchMonthlyCounts(win.from, win.months, places), [win, places]);
  const { data: monthly, reload: reloadMonthly } = useResearcherFetch(fetchMonthly, EMPTY_MONTHLY);

  // Stepping the year or changing range/location reloads only the line chart's series.
  const isFirstMonthly = useRef(true);
  useEffect(() => {
    if (isFirstMonthly.current) {
      isFirstMonthly.current = false;
      return;
    }
    let cancelled = false;
    setIsMonthlyLoading(true);
    reloadMonthly().finally(() => { if (!cancelled) setIsMonthlyLoading(false); });
    return () => { cancelled = true; };
  }, [win, places, reloadMonthly]);

  const firstYear = monthly?.firstMonth ? Number(monthly.firstMonth.slice(0, 4)) : currentYear;

  const monthlyCounts: ChartSlot[] = useMemo(() => {
    // Backend without researcher_monthly_counts: fall back to the overview's last 6 months.
    if (monthly === null) {
      const counts = new Map(overview.per_month.map(m => [m.month, m.count]));
      return monthsBack(6).map(m => ({ key: m.key, label: m.label, value: counts.get(monthKey(m.year, m.month)) ?? 0 }));
    }
    const counts = new Map(monthly.months.map(m => [m.month, m.count]));
    const now = new Date();
    const nowIndex = now.getFullYear() * 12 + now.getMonth();
    return Array.from({ length: win.months }, (_, i) => {
      const d = new Date(win.from.year, win.from.month + i, 1);
      const key = monthKey(d.getFullYear(), d.getMonth());
      const future = d.getFullYear() * 12 + d.getMonth() > nowIndex;
      return { key, label: shortMonth(d), fullLabel: `${shortMonth(d)} ${d.getFullYear()}`, value: future ? null : counts.get(key) ?? 0 };
    });
  }, [monthly, overview.per_month, win]);

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

          <View style={s.locationRow}>
            <TouchableOpacity
              style={[s.locationChip, places.length > 0 && s.locationChipActive]}
              onPress={() => setLocationOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Location filter: ${placesLabel(places)}`}
            >
              <Ionicons name="location-outline" size={15} color={places.length > 0 ? Colors.onDark : Colors.inkMuted} />
              <Text style={[s.locationChipText, places.length > 0 && s.locationChipTextActive]} numberOfLines={1}>
                {placesLabel(places)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={places.length > 0 ? Colors.onDark : Colors.inkMuted} />
            </TouchableOpacity>
            {places.length > 1 && (
              <Text style={s.filterHint} numberOfLines={2}>{places.map(p => p.city).join(', ')}</Text>
            )}
          </View>

          <View style={isWide && s.statGridWide}>
            <View style={[s.statRow, isWide && s.statRowWide]}>
              <StatCard label="Decisions" value={overview.total.toLocaleString()} variant="ink" increase={overview.this_month} />
              <StatCard label="Active field users" value={overview.active_farmers.toLocaleString()} variant="teal" increase={overview.new_farmers_this_month} />
            </View>
            <View style={[s.statRow, isWide && s.statRowWide]}>
              <StatCard label="Researchers" value={overview.researchers.toLocaleString()} variant="brand" />
              <StatCard label="Average gain/ha" value={formatCurrency(overview.average_gain)} variant="soft" />
            </View>
          </View>

          <Text style={s.periodCaption}>CHART PERIOD</Text>
          <AnimatedFilterBar options={RANGE_OPTIONS} selected={range} onSelect={setRange} />

          {isRangeLoading ? <ChartCardsSkeleton /> : (
            <>
              <View style={s.section}>
                <View style={s.sectionHeadRow}>
                  <Text style={s.sectionTitle}>Decisions per month</Text>
                  {range === 'all' && monthly !== null ? (
                    <View style={s.yearStepper}>
                      <TouchableOpacity
                        onPress={() => setChartYear(y => y - 1)}
                        disabled={chartYear <= firstYear || isMonthlyLoading}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Previous year"
                      >
                        <Ionicons name="chevron-back" size={18} color={chartYear <= firstYear ? Colors.disabled : Colors.ink} />
                      </TouchableOpacity>
                      <Text style={s.yearText}>{chartYear}</Text>
                      <TouchableOpacity
                        onPress={() => setChartYear(y => y + 1)}
                        disabled={chartYear >= currentYear || isMonthlyLoading}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Next year"
                      >
                        <Ionicons name="chevron-forward" size={18} color={chartYear >= currentYear ? Colors.disabled : Colors.ink} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={s.sectionHint}>{monthly === null ? 'Last 6 months' : range === '3m' ? 'Last 3 months' : 'Last 12 months'}</Text>
                  )}
                </View>
                {isMonthlyLoading ? <Skeleton height={144} radius={10} /> : (
                  <AreaLineChart
                    key={`${range}-${chartYear}`}
                    points={monthlyCounts}
                    unit={{ one: 'decision', many: 'decisions' }}
                    accessibilityLabel={monthlyCounts.filter(m => m.value !== null).map(m => `${m.fullLabel ?? m.label} ${m.value}`).join(', ')}
                  />
                )}
              </View>

              <View style={isWide && s.splitRow}>
                <View style={[s.section, isWide && s.typesCol]}>
                  <Text style={s.sectionTitle}>Decision types</Text>
                  <Text style={s.sectionHint}>{overview.range_total} total</Text>
                  <View style={s.typesBody}>
                    <DonutChart
                      size={112}
                      stroke={16}
                      segments={typeBreakdown.map(t => ({ key: t.id, value: t.count, color: TYPE_COLORS[t.id] }))}
                      centerValue={overview.range_total.toLocaleString()}
                      centerLabel="decisions"
                      accessibilityLabel={typeBreakdown.map(t => `${t.label} ${t.count}`).join(', ')}
                    />
                    <View style={s.legend}>
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
                </View>

                {topMunicipalities.length > 0 && (
                  <View style={[s.section, isWide && s.muniCol]}>
                    <Text style={s.sectionTitle}>Top municipalities</Text>
                    <View style={{ gap: 12, marginTop: 14 }}>
                      {topMunicipalities.map((m, i) => (
                        <View key={m.city}>
                          <View style={s.muniTopRow}>
                            <Text style={s.muniLabel} numberOfLines={1}>{m.city}</Text>
                            <Text style={s.muniCount}>{m.count}</Text>
                          </View>
                          <GradientBar pct={m.pct} order={i} />
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

      <ExportSheet visible={exportOpen} onClose={() => setExportOpen(false)} initialPlaces={places} />
      <LocationFilterSheet visible={locationOpen} selected={places} onClose={() => setLocationOpen(false)} onApply={setPlaces} />
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

  locationRow: { marginTop: -6, marginBottom: 14, gap: 6 },
  periodCaption: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: Colors.inkFaint, marginTop: 10, marginBottom: 8 },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearText: { fontSize: 13.5, fontWeight: '800', color: Colors.ink, fontVariant: ['tabular-nums'] },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', maxWidth: '100%',
    borderWidth: 1.5, borderColor: Colors.chipBorder, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  locationChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  locationChipText: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: Colors.inkMuted },
  locationChipTextActive: { fontWeight: '700', color: Colors.onDark },
  filterHint: { fontSize: 12.5, fontWeight: '600', color: Colors.accent },

  section: { ...cardSurface, padding: CARD_PADDING, marginTop: 12 },
  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: Colors.ink, marginBottom: 3 },
  sectionHint: { fontSize: 12, color: Colors.inkFaint, marginBottom: 16 },

  // Side by side on wide screens; municipalities get the wider share of the row.
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  typesCol: { flex: 2 },
  muniCol: { flex: 3 },
  typesBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 13.5, color: Colors.inkMuted },
  legendCount: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },
  legendPct: { fontSize: 12, color: Colors.inkFaint, width: 34, textAlign: 'right' },

  muniTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  muniLabel: { flex: 1, fontSize: 13.5, color: Colors.inkMuted, marginRight: 8 },
  muniCount: { fontSize: 13, fontWeight: '700', color: Colors.ink },

  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: Colors.ink },
});
