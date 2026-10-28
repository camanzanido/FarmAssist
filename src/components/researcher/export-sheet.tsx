import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { LocationFilterSheet } from '@/src/components/researcher/location-filter-sheet';
import { BottomSheet } from '@/src/components/ui/bottom-sheet';
import { Skeleton } from '@/src/components/ui/skeleton';
import { DECISION_LABELS } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import type { Location } from '@/src/database/repositories/locations';
import {
  countDecisionsInRange, fetchAllLocations, fetchAllUsers, fetchDecisionsInRange, type Place,
} from '@/src/database/repositories/researcher';
import type { User } from '@/src/database/repositories/users';
import { canSaveToFolder, ExportPayload, saveExportToFolder, shareExport } from '@/src/services/exportFile';
import { getActionErrorMessage } from '@/src/utils/errors';
import { placesFileSuffix, placesLabel } from '@/src/utils/placeFilter';
import {
  buildCsv,
  buildPdfHtml,
  compareYearMonth,
  ExportPreset,
  ExportRange,
  exportFileName,
  rangeBounds,
  rangeLabel,
  shiftMonth,
  YearMonth,
  yearMonthOf,
} from '@/src/utils/exportReport';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Format = 'excel' | 'pdf';
type Action = 'save' | 'share';

const PRESETS: { id: ExportPreset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'this-year', label: 'This year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

const formatMonth = (ym: YearMonth) =>
  new Date(ym.year, ym.month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function MonthStepper({ label, value, max, onChange }: {
  label: string;
  value: YearMonth;
  max: YearMonth;
  onChange: (next: YearMonth) => void;
}) {
  const atMax = compareYearMonth(value, max) >= 0;
  return (
    <View style={s.stepperRow}>
      <Text style={s.stepperLabel}>{label}</Text>
      <TouchableOpacity
        style={s.stepperBtn}
        onPress={() => onChange(shiftMonth(value, -1))}
        accessibilityLabel={`${label}: previous month`}
      >
        <Ionicons name="chevron-back" size={18} color={C.text} />
      </TouchableOpacity>
      <Text style={s.stepperValue}>{formatMonth(value)}</Text>
      <TouchableOpacity
        style={[s.stepperBtn, atMax && s.stepperBtnDisabled]}
        onPress={() => onChange(shiftMonth(value, 1))}
        disabled={atMax}
        accessibilityLabel={`${label}: next month`}
      >
        <Ionicons name="chevron-forward" size={18} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

type Counts = { inRange: number; total: number } | null;

export function ExportSheet({ visible, onClose, initialPlaces = [] }: { visible: boolean; onClose: () => void; initialPlaces?: Place[] }) {
  const thisMonth = yearMonthOf(new Date());
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [locationOpen, setLocationOpen] = useState(false);
  const [format, setFormat] = useState<Format>('excel');
  const [range, setRange] = useState<ExportRange>({ preset: 'all', from: thisMonth, to: thisMonth });
  const [includeFarmerLocation, setIncludeFarmerLocation] = useState(true);
  const [includeClimate, setIncludeClimate] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [counts, setCounts] = useState<Counts>(null);
  const [countFailed, setCountFailed] = useState(false);
  const { notify } = useFeedback();

  const now = new Date();
  const periodLabel = rangeLabel(range, now);
  const scopeLabel = places.length > 0 ? `${periodLabel} · ${places.length === 1 ? `${places[0].city}, ${places[0].province}` : placesLabel(places)}` : periodLabel;
  const rangeKey = JSON.stringify([range, places]);

  // Each time the sheet opens it starts from the Overview's current location filter.
  useEffect(() => {
    if (visible) setPlaces(initialPlaces);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCounts(null);
    setCountFailed(false);
    Promise.all([
      countDecisionsInRange(rangeBounds(range, new Date()), places),
      countDecisionsInRange({ start: null, end: null }, places),
    ])
      .then(([inRange, total]) => { if (!cancelled) setCounts({ inRange, total }); })
      .catch(err => {
        console.error('Failed to count decisions for export:', err);
        if (!cancelled) setCountFailed(true);
      });
    return () => { cancelled = true; };
  }, [visible, rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildPayload = async (): Promise<ExportPayload> => {
    const bounds = rangeBounds(range, new Date());
    const charts = format === 'pdf' && includeCharts;
    // The municipality chart needs locations even when the table leaves them out.
    const [decisions, users, locations] = await Promise.all([
      fetchDecisionsInRange(bounds, places),
      includeFarmerLocation ? fetchAllUsers() : Promise.resolve([] as User[]),
      includeFarmerLocation || charts ? fetchAllLocations() : Promise.resolve([] as Location[]),
    ]);
    const opts = { includeFarmerLocation, includeClimate, includeCharts: charts };
    const ctx = {
      usersById: new Map(users.map(u => [u.id, u])),
      locationsById: new Map(locations.map(l => [l.id, l])),
      typeLabels: DECISION_LABELS as Record<string, string>,
    };
    const generatedAt = new Date();
    const suffix = placesFileSuffix(places);
    return format === 'excel'
      ? { kind: 'csv', fileName: exportFileName(range, generatedAt, 'csv', suffix), content: buildCsv(decisions, opts, ctx) }
      : {
        kind: 'pdf',
        fileName: exportFileName(range, generatedAt, 'pdf', suffix),
        html: buildPdfHtml(decisions, opts, ctx, { rangeLabel: scopeLabel, generatedAt }),
      };
  };

  const run = async (action: Action) => {
    setBusy(action);
    try {
      const payload = await buildPayload();
      if (action === 'save') {
        const result = await saveExportToFolder(payload);
        if (result.status === 'cancelled') return;
        onClose();
        notify.success('Export saved', result.fileName);
      } else {
        await shareExport(payload);
        onClose();
      }
    } catch (err) {
      console.error(`Export ${action} failed:`, err);
      onClose();
      notify.error(
        'Export failed',
        getActionErrorMessage(err, action === 'save' ? "Couldn't save the file. Please try again." : "Couldn't share the file. Please try again.")
      );
    } finally {
      setBusy(null);
    }
  };

  const setPreset = (preset: ExportPreset) => setRange(r => ({ ...r, preset }));
  const setFrom = (from: YearMonth) => setRange(r => ({ ...r, from }));
  const setTo = (to: YearMonth) => setRange(r => ({ ...r, to }));

  const inRangeCount = counts?.inRange ?? 0;
  const empty = counts !== null && inRangeCount === 0;
  const blocked = counts === null && !countFailed;
  const primary: Action = canSaveToFolder ? 'save' : 'share';

  return (
    <>
    <BottomSheet visible={visible} onClose={onClose}>
            <Text style={s.title}>Export decisions</Text>
            {counts ? (
              <Text style={s.subtitle}>
                {counts.inRange.toLocaleString()} of {counts.total.toLocaleString()} decisions · {scopeLabel}
              </Text>
            ) : countFailed ? (
              <Text style={s.subtitle}>{scopeLabel} · couldn&apos;t count decisions</Text>
            ) : (
              <Skeleton width={190} height={14} style={s.subtitleSkeleton} />
            )}

            <Text style={s.sectionLabel}>PERIOD</Text>
            <View style={s.chipRow}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.chip, range.preset === p.id && s.chipActive]}
                  onPress={() => setPreset(p.id)}
                  accessibilityState={{ selected: range.preset === p.id }}
                >
                  <Text style={[s.chipText, range.preset === p.id && s.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {range.preset === 'custom' && (
              <View style={s.customCard}>
                <MonthStepper label="From" value={range.from} max={thisMonth} onChange={setFrom} />
                <View style={s.customDivider} />
                <MonthStepper label="To" value={range.to} max={thisMonth} onChange={setTo} />
              </View>
            )}

            <Text style={s.sectionLabel}>LOCATION</Text>
            <TouchableOpacity
              style={[s.chip, s.locationChip, places.length > 0 && s.chipActive]}
              onPress={() => setLocationOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Location: ${placesLabel(places)}`}
            >
              <Ionicons name="location-outline" size={15} color={places.length > 0 ? C.accentDeepText : C.textSoft} />
              <Text style={[s.chipText, places.length > 0 && s.chipTextActive]} numberOfLines={1}>{placesLabel(places)}</Text>
              <Ionicons name="chevron-down" size={14} color={places.length > 0 ? C.accentDeepText : C.textSoft} />
            </TouchableOpacity>

            <Text style={s.sectionLabel}>FORMAT</Text>
            <View style={s.formatRow}>
              <TouchableOpacity
                style={[s.formatCard, format === 'excel' && s.formatCardSelected]}
                onPress={() => setFormat('excel')}
              >
                <Ionicons name="grid-outline" size={24} color={format === 'excel' ? C.accentStrong : C.textSoft} />
                <Text style={s.formatLabel}>Excel (CSV)</Text>
                <Text style={s.formatHint}>Raw rows</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.formatCard, format === 'pdf' && s.formatCardSelected]}
                onPress={() => setFormat('pdf')}
              >
                <Ionicons name="document-text-outline" size={24} color={format === 'pdf' ? C.accentStrong : C.textSoft} />
                <Text style={s.formatLabel}>PDF</Text>
                <Text style={s.formatHint}>Printable report</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>INCLUDE</Text>
            <View style={s.includeCard}>
              <View style={[s.includeRow, s.includeRowBorder]}>
                <View style={[s.checkbox, s.checkboxChecked]}>
                  <Ionicons name="checkmark" size={15} color={C.accentDeepText} />
                </View>
                <Text style={s.includeLabel}>Decision inputs & results</Text>
              </View>
              <TouchableOpacity
                style={[s.includeRow, s.includeRowBorder]}
                onPress={() => setIncludeFarmerLocation(v => !v)}
              >
                <View style={[s.checkbox, includeFarmerLocation && s.checkboxChecked]}>
                  {includeFarmerLocation && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
                </View>
                <Text style={s.includeLabel}>Field user & location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.includeRow, format === 'pdf' && s.includeRowBorder]} onPress={() => setIncludeClimate(v => !v)}>
                <View style={[s.checkbox, includeClimate && s.checkboxChecked]}>
                  {includeClimate && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
                </View>
                <Text style={s.includeLabel}>Climate probabilities</Text>
              </TouchableOpacity>
              {format === 'pdf' && (
                <TouchableOpacity style={s.includeRow} onPress={() => setIncludeCharts(v => !v)}>
                  <View style={[s.checkbox, includeCharts && s.checkboxChecked]}>
                    {includeCharts && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
                  </View>
                  <Text style={s.includeLabel}>Charts</Text>
                </TouchableOpacity>
              )}
            </View>

            {empty && <Text style={s.emptyHint}>No decisions in this period. Pick a different period to export.</Text>}

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.exportBtn, (empty || blocked || busy !== null) && s.exportBtnDisabled]}
                onPress={() => run(primary)}
                disabled={empty || blocked || busy !== null}
                activeOpacity={0.85}
              >
                {busy === primary ? (
                  <ActivityIndicator color={C.accentDeepText} />
                ) : (
                  <Ionicons name={primary === 'save' ? 'download-outline' : 'share-outline'} size={19} color={C.accentDeepText} />
                )}
                <Text style={s.exportBtnText}>
                  {primary === 'save' ? 'Save' : 'Export'}{counts ? ` ${inRangeCount.toLocaleString()} record${inRangeCount === 1 ? '' : 's'}` : ''}
                </Text>
              </TouchableOpacity>
              {canSaveToFolder && (
                <TouchableOpacity
                  style={[s.shareBtn, (empty || blocked || busy !== null) && s.exportBtnDisabled]}
                  onPress={() => run('share')}
                  disabled={empty || blocked || busy !== null}
                  accessibilityLabel="Share file"
                >
                  {busy === 'share'
                    ? <ActivityIndicator color={C.text} />
                    : <Ionicons name="share-social-outline" size={21} color={C.text} />}
                </TouchableOpacity>
              )}
            </View>
    </BottomSheet>
    <LocationFilterSheet visible={visible && locationOpen} selected={places} onClose={() => setLocationOpen(false)} onApply={setPlaces} />
    </>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginBottom: 20 },
  subtitleSkeleton: { marginTop: 2, marginBottom: 22 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textSoft },
  chipTextActive: { color: C.accentDeepText, fontWeight: '800' },

  customCard: { backgroundColor: C.fill, borderRadius: 14, paddingHorizontal: 15, marginBottom: 12 },
  customDivider: { height: 1, backgroundColor: C.divider },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  stepperLabel: { fontSize: 14, color: C.textSoft, width: 48 },
  stepperBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperValue: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },

  formatRow: { flexDirection: 'row', gap: 9, marginTop: 8, marginBottom: 20 },
  formatCard: { flex: 1, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 15, alignItems: 'center' },
  formatCardSelected: { borderWidth: 2, borderColor: C.accentStrong, backgroundColor: C.accentTint },
  formatLabel: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 7 },
  formatHint: { fontSize: 11.5, color: C.textSoft, marginTop: 2 },

  includeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, overflow: 'hidden', marginBottom: 18 },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14 },
  includeRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  includeLabel: { flex: 1, fontSize: 14.5, color: C.text },

  emptyHint: { fontSize: 13, color: C.amberText, marginBottom: 12, textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, height: 58, borderRadius: 15, backgroundColor: C.accentStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  exportBtnDisabled: { opacity: 0.4 },
  exportBtnText: { fontSize: 16, fontWeight: '800', color: C.accentDeepText },
  shareBtn: { width: 58, height: 58, borderRadius: 15, borderWidth: 1.5, borderColor: C.cardBorderStrong, alignItems: 'center', justifyContent: 'center' },
});
