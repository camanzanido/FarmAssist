import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { ListScreenSkeleton } from '@/src/components/researcher/skeletons';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import {
  blankPredefinedForm, PredefinedFormInitial, PredefinedFormMode, PredefinedFormSheet,
} from '@/src/components/researcher/predefined-form-sheet';
import { ALL_DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { cardShadow, ResearcherColors as C } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import {
  createPredefinedOption, deletePredefinedOption, fetchOptionAverages, fetchPredefinedOptions, PredefinedInput, updatePredefinedOption,
} from '@/src/database/repositories/predefined';
import { fetchAllLocations } from '@/src/database/repositories/researcher';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { getActionErrorMessage } from '@/src/utils/errors';
import { formatCurrency } from '@/src/utils/formatters';
import {
  climateRowToFormValues, OptionAverage, placeLabel, PredefinedOption, predefinedKey,
} from '@/src/utils/predefinedOptions';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'farmers' | 'published';
type TypeFilter = 'all' | DecisionType;
type Editing = { mode: Exclude<PredefinedFormMode, 'edit'> } | { mode: 'edit'; option: PredefinedOption };

const EMPTY = {
  published: [] as PredefinedOption[],
  averages: [] as OptionAverage[],
  places: {} as Record<string, string[]>,
};

// Province -> its cities, spelled as farmers registered them.
function placesFrom(locations: { city: string; province: string }[]): Record<string, string[]> {
  const byProvince = new Map<string, { name: string; cities: Map<string, string> }>();
  for (const l of locations) {
    const province = (l.province ?? '').trim();
    if (!province) continue;
    const entry = byProvince.get(province.toLowerCase()) ?? { name: province, cities: new Map() };
    const city = (l.city ?? '').trim();
    if (city && !entry.cities.has(city.toLowerCase())) entry.cities.set(city.toLowerCase(), city);
    byProvince.set(province.toLowerCase(), entry);
  }
  const places: Record<string, string[]> = {};
  for (const { name, cities } of byProvince.values()) {
    places[name] = [...cities.values()].sort((a, b) => a.localeCompare(b));
  }
  return places;
}

type ListItem =
  | { key: string; kind: 'average'; average: OptionAverage }
  | { key: string; kind: 'published'; option: PredefinedOption };

const rowKey = (a: OptionAverage) => [a.decision_type, a.option_key, a.province, a.municipality].join('|');

export default function ResearcherInputsScreen() {
  const { user } = useAuth();
  const { confirm, notify } = useFeedback();

  const fetchAll = useCallback(async () => {
    const [published, averages, locations] = await Promise.all([
      fetchPredefinedOptions(), fetchOptionAverages(), fetchAllLocations(),
    ]);
    return { published, averages, places: placesFrom(locations) };
  }, []);
  const { data: { published, averages, places }, isLoading, isRefreshing, error, reload, refresh } = useResearcherFetch(fetchAll, EMPTY);

  const [tab, setTab] = useState<Tab>('farmers');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [sheetMode, setSheetMode] = useState<PredefinedFormMode>('create');
  const [formInitial, setFormInitial] = useState<PredefinedFormInitial>(() => blankPredefinedForm());
  const [saving, setSaving] = useState(false);

  const publishedByKey = useMemo(() => new Map(published.map((p) => [predefinedKey(p), p])), [published]);
  const publishedIds = useMemo(() => new Map(published.map((p) => [predefinedKey(p), p.id])), [published]);

  const matches = useCallback((o: { decision_type: string; option_name: string; province: string | null; municipality: string | null }) => {
    if (typeFilter !== 'all' && o.decision_type !== typeFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [o.option_name, o.province, o.municipality].some((f) => f?.toLowerCase().includes(q));
  }, [typeFilter, query]);

  const filteredAverages = useMemo(() => averages.filter(matches), [averages, matches]);
  const filteredPublished = useMemo(() => published.filter(matches), [published, matches]);

  const openCreate = () => {
    setFormInitial(blankPredefinedForm(typeFilter === 'all' ? 'crop_choice' : typeFilter));
    setEditing({ mode: 'create' });
    setSheetMode('create');
  };

  const openPublish = (average: OptionAverage) => {
    setFormInitial({
      decisionType: average.decision_type as DecisionType,
      province: average.province,
      municipality: average.municipality,
      values: climateRowToFormValues(average),
      source: { entries: average.total_entries, farmers: average.farmer_count },
    });
    setEditing({ mode: 'publish' });
    setSheetMode('publish');
  };

  const openEdit = (option: PredefinedOption) => {
    setFormInitial({
      decisionType: option.decision_type as DecisionType,
      province: option.province ?? '',
      municipality: option.municipality ?? '',
      values: climateRowToFormValues(option),
      source: option.source_entries != null && option.source_farmers != null
        ? { entries: option.source_entries, farmers: option.source_farmers }
        : null,
    });
    setEditing({ mode: 'edit', option });
    setSheetMode('edit');
  };

  // Publishing a name and place that is already published replaces that row instead of duplicating it.
  const handleSave = async (input: PredefinedInput) => {
    if (!editing || !user) return;
    const existing = publishedByKey.get(predefinedKey({
      decision_type: input.decisionType,
      option_name: input.values.name,
      province: input.province,
      municipality: input.municipality,
    }));
    const targetId = editing.mode === 'edit' ? editing.option.id : existing?.id;
    setSaving(true);
    try {
      if (targetId) await updatePredefinedOption(targetId, input, user.id);
      else await createPredefinedOption(input, user.id);
      setEditing(null);
      notify.success(editing.mode === 'edit' ? 'Option updated' : existing ? 'Published values replaced' : 'Option published');
      reload();
    } catch (err) {
      console.error('Failed to save predefined option:', err);
      setEditing(null);
      notify.error('Could not save option', getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (editing?.mode !== 'edit') return;
    const option = editing.option;
    setEditing(null);
    const confirmed = await confirm({
      title: 'Unpublish this option?',
      message: `Farmers will no longer be able to load "${option.option_name}". Decisions already made with it are not affected, and the farmer average stays in the From farmers list.`,
      confirmText: 'Unpublish',
      tone: 'destructive',
      icon: 'trash-outline',
    });
    if (!confirmed) return;
    try {
      await deletePredefinedOption(option.id);
      notify.success('Option unpublished');
      reload();
    } catch (err) {
      console.error('Failed to delete predefined option:', err);
      notify.error('Could not unpublish option', getActionErrorMessage(err, 'Please try again.'));
    }
  };

  const typeLabel = (t: string) => DECISION_LABELS[t as DecisionType] ?? t;

  const filterOptions = useMemo(
    () => [{ value: 'all' as const, label: 'All' }, ...ALL_DECISIONS.map(d => ({ value: d.id, label: d.label }))],
    []
  );

  const renderAverage = (a: OptionAverage) => {
    const pub = publishedByKey.get(predefinedKey(a));
    const stale = !!pub && !!a.latest_entry && Date.parse(a.latest_entry) > Date.parse(pub.updated_at);
    return (
      <TouchableOpacity
        key={rowKey(a)}
        style={s.row}
        onPress={() => openPublish(a)}
        activeOpacity={0.75}
        accessibilityLabel={`Review ${a.option_name} average for ${placeLabel(a)}`}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={1}>{a.option_name}</Text>
          <Text style={s.rowMeta} numberOfLines={1}>{typeLabel(a.decision_type)} · {placeLabel(a)}</Text>
          <View style={s.tagRow}>
            <Text style={s.rowCount}>
              {a.total_entries} {a.total_entries === 1 ? 'entry' : 'entries'} · {a.farmer_count} {a.farmer_count === 1 ? 'farmer' : 'farmers'}
            </Text>
            {pub && (
              <View style={[s.tag, stale && s.tagWarn]}>
                <Text style={[s.tagText, stale && s.tagWarnText]}>{stale ? 'New entries since published' : 'Published'}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={s.rowPrice}>{formatCurrency(a.price)}/kg</Text>
        <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
      </TouchableOpacity>
    );
  };

  const renderPublished = (o: PredefinedOption) => (
    <TouchableOpacity key={o.id} style={s.row} onPress={() => openEdit(o)} activeOpacity={0.75}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{o.option_name}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{typeLabel(o.decision_type)} · {placeLabel(o)}</Text>
        <Text style={s.rowCount}>
          {o.source_entries != null ? `From ${o.source_entries} ${o.source_entries === 1 ? 'entry' : 'entries'}` : 'Entered by a researcher'}
        </Text>
      </View>
      <Text style={s.rowPrice}>{formatCurrency(o.price)}/kg</Text>
      <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
    </TouchableOpacity>
  );

  const total = tab === 'farmers' ? averages.length : published.length;
  const items: ListItem[] = useMemo(
    () => tab === 'farmers'
      ? filteredAverages.map(a => ({ key: `a:${rowKey(a)}`, kind: 'average' as const, average: a }))
      : filteredPublished.map(o => ({ key: `p:${o.id}`, kind: 'published' as const, option: o })),
    [tab, filteredAverages, filteredPublished]
  );

  const header = (
    <View>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Inputs</Text>
          <Text style={s.subtitle}>Review what farmers entered, then publish values others can load</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} accessibilityLabel="Add predefined option">
          <Ionicons name="add" size={20} color={C.accentDeepText} />
          <Text style={s.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.segment}>
        {([['farmers', 'From farmers', averages.length], ['published', 'Published', published.length]] as const).map(([key, label, count]) => (
          <TouchableOpacity
            key={key}
            style={[s.segmentBtn, tab === key && s.segmentBtnActive]}
            onPress={() => setTab(key)}
            accessibilityState={{ selected: tab === key }}
          >
            <Text style={[s.segmentText, tab === key && s.segmentTextActive]}>{label} ({count})</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color={C.textFaint} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Option, municipality, or province"
          placeholderTextColor={C.textMuted}
        />
      </View>

      <View style={s.filterRow}>
        <AnimatedFilterBar options={filterOptions} selected={typeFilter} onSelect={setTypeFilter} />
      </View>
    </View>
  );

  const empty = tab === 'farmers' ? (
    <EmptyState
      icon="people-outline"
      title={total === 0 ? 'No farmer entries yet.' : 'No matches.'}
      subtitle="Averages appear here once signed-in farmers sync decisions."
    />
  ) : (
    <EmptyState
      icon="options-outline"
      title={total === 0 ? 'Nothing published yet.' : 'No matches.'}
      subtitle="Open a farmer average to review and publish it."
    />
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load predefined inputs. Check your connection."
        skeleton={<ListScreenSkeleton />}
      >
        <FlatList
          data={items}
          keyExtractor={item => item.key}
          renderItem={({ item }) => item.kind === 'average' ? renderAverage(item.average) : renderPublished(item.option)}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={<View style={{ height: 20 }} />}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={C.text} colors={[C.accent]} />}
        />
      </ResearcherAsyncState>

      <PredefinedFormSheet
        visible={editing !== null}
        mode={sheetMode}
        initial={formInitial}
        knownPlaces={places}
        publishedIds={publishedIds}
        editingId={editing?.mode === 'edit' ? editing.option.id : undefined}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginTop: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.accentStrong },
  addText: { fontSize: 14, fontWeight: '800', color: C.accentDeepText },

  segment: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 12, padding: 4, marginBottom: 12 },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentBtnActive: { backgroundColor: C.accentStrong },
  segmentText: { fontSize: 13, fontWeight: '600', color: C.textSoft },
  segmentTextActive: { color: C.accentDeepText, fontWeight: '800' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorderStrong, borderRadius: 13, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, height: '100%' },

  filterRow: { marginBottom: 18 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 11, ...cardShadow },
  rowName: { fontSize: 15.5, fontWeight: '700', color: C.text },
  rowMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 3 },
  rowCount: { fontSize: 12, color: C.textFaint, marginTop: 4 },
  rowPrice: { fontSize: 13.5, fontWeight: '800', color: C.accent },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tag: { marginTop: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: C.accentTint },
  tagText: { fontSize: 11, fontWeight: '700', color: C.accent },
  tagWarn: { backgroundColor: C.amberBg },
  tagWarnText: { color: C.amberText },
});
