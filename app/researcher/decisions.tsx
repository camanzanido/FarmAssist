import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { DecisionsMapView, type Place } from '@/src/components/researcher/decisions-map-view';
import { Pager } from '@/src/components/researcher/pager';
import { ListRowsSkeleton, ListScreenSkeleton } from '@/src/components/researcher/skeletons';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { DECISIONS, DECISION_ICONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { CARD_PADDING, cardShadow, cardSurface, Colors } from '@/src/constants/colors';
import { decisionResultLabel } from '@/src/constants/copy';
import { wideColumn } from '@/src/constants/layout';
import { deleteDecisionRemote, fetchDecisionsPage, type ResearcherDecisionRow } from '@/src/database/repositories/researcher';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherPage } from '@/src/hooks/use-researcher-page';
import { getActionErrorMessage } from '@/src/utils/errors';
import { ProfitAmount } from '@/src/components/ui/profit-amount';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type TypeFilter = 'all' | DecisionType;
type DecisionsView = 'list' | 'map';

// Height the floating view toggle takes over the map.
const MAP_TOP_INSET = 58;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function DecisionRow({ decision: d, isDeleting, onDelete }: {
  decision: ResearcherDecisionRow;
  isDeleting: boolean;
  onDelete: (d: ResearcherDecisionRow) => void;
}) {
  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <Ionicons name={DECISION_ICONS[d.decision_type as DecisionType] ?? 'help-circle-outline'} size={21} color={Colors.ink} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardResult} numberOfLines={1}>{decisionResultLabel(d.result)}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>
          {DECISION_LABELS[d.decision_type as DecisionType] ?? d.decision_type}
          {d.farmer_name ? ` · ${d.farmer_name}` : ''}
          {d.city ? ` · ${d.city}` : ''}
        </Text>
        <View style={s.cardMetaRow}>
          {d.result !== '' && <ProfitAmount value={d.profit_increase} />}
          <Text style={s.cardDate}>{formatDate(d.datetime)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(d)}
        disabled={isDeleting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Remove ${decisionResultLabel(d.result)}`}
      >
        {isDeleting
          ? <ActivityIndicator size="small" color={Colors.danger} />
          : <Ionicons name="trash-outline" size={18} color={Colors.danger} />}
      </TouchableOpacity>
    </View>
  );
}

export default function ResearcherDecisionsScreen() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<DecisionsView>('map');
  const [mapMounted, setMapMounted] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const listRef = useRef<FlatList<ResearcherDecisionRow>>(null);
  const { confirm, notify } = useFeedback();
  const insets = useSafeAreaInsets();

  const debouncedQuery = useDebouncedValue(query.trim());
  const filters = useMemo(
    () => ({ type: typeFilter === 'all' ? null : typeFilter, query: debouncedQuery, place }),
    [typeFilter, debouncedQuery, place]
  );
  const {
    rows, pageInfo, pageSize, isLoading, isPageLoading, isRefreshing, error, setPage, setPageSize, reload, refresh, retry,
  } = useResearcherPage(fetchDecisionsPage, filters);

  const filterOptions = useMemo(
    () => [{ value: 'all' as const, label: 'All' }, ...DECISIONS.map(d => ({ value: d.id, label: d.label }))],
    []
  );
  const isFiltered = typeFilter !== 'all' || debouncedQuery.length > 0 || place !== null;

  const switchView = (next: DecisionsView) => {
    if (next === 'map') setMapMounted(true);
    setView(next);
  };

  // The map hands over a municipality; show its decisions from the first page.
  const showPlace = (next: Place) => {
    setPlace(next);
    setView('list');
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const goToPage = (p: number) => {
    setPage(p);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const confirmDelete = async (decision: ResearcherDecisionRow) => {
    const confirmed = await confirm({
      title: 'Remove this decision?',
      message: `This permanently deletes "${decisionResultLabel(decision.result)}" from the database. This can't be undone.`,
      confirmText: 'Remove',
      tone: 'destructive',
      icon: 'trash-outline',
    });
    if (!confirmed) return;

    setDeletingId(decision.id);
    try {
      await deleteDecisionRemote(decision.id);
      await reload();
      notify.success('Decision removed');
    } catch (err) {
      console.error('Failed to delete decision:', err);
      notify.error('Could not remove decision', getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  const header = (
    <View>
      {place && (
        <View style={s.placeChip}>
          <Ionicons name="location" size={15} color={Colors.accent} />
          <Text style={s.placeChipText} numberOfLines={1}>{place.city}, {place.province}</Text>
          <TouchableOpacity onPress={() => setPlace(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Clear ${place.city} filter`}>
            <Ionicons name="close-circle" size={18} color={Colors.inkFaint} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={19} color={Colors.inkFaint} />
        <TextInput
          style={s.searchInput}
          placeholder="Farmer, result, or municipality"
          placeholderTextColor={Colors.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filterRow}>
        <AnimatedFilterBar options={filterOptions} selected={typeFilter} onSelect={setTypeFilter} />
      </View>
    </View>
  );

  const empty = isPageLoading ? (
    <ListRowsSkeleton rows={Math.min(pageSize, 6)} />
  ) : (
    <EmptyState
      icon={isFiltered ? 'search-outline' : 'document-text-outline'}
      title={isFiltered ? 'No decisions match this search.' : 'No decisions recorded yet.'}
      subtitle={isFiltered ? 'Try a different search term, type, or place.' : undefined}
    />
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={[s.topBar, view === 'map' && [s.topBarFloating, { top: insets.top }]]} pointerEvents="box-none">
        {view === 'list' && <Text style={s.title}>Decisions</Text>}
        <View style={[s.segment, view === 'map' && s.segmentFloating]} accessibilityRole="tablist">
          {(['map', 'list'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.segmentBtn, view === v && s.segmentBtnActive]}
              onPress={() => switchView(v)}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
            >
              <Ionicons name={v === 'list' ? 'list' : 'map-outline'} size={15} color={view === v ? Colors.onDark : Colors.inkSoft} />
              <Text style={[s.segmentText, view === v && s.segmentTextActive]}>{v === 'list' ? 'List' : 'Map'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {mapMounted && (
        <View style={[s.fill, view !== 'map' && s.hidden]}>
          <DecisionsMapView onShowDecisions={showPlace} topInset={MAP_TOP_INSET} />
        </View>
      )}

      <View style={[s.fill, view !== 'list' && s.hidden]}>
        <ResearcherAsyncState
          isLoading={isLoading}
          error={error}
          onRetry={retry}
          errorMessage="Couldn't load decisions. Check your connection."
          skeleton={<ListScreenSkeleton />}
        >
          <FlatList
            ref={listRef}
            data={isPageLoading ? [] : rows}
            keyExtractor={d => d.id}
            renderItem={({ item }) => (
              <DecisionRow decision={item} isDeleting={deletingId === item.id} onDelete={confirmDelete} />
            )}
            extraData={deletingId}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            ListFooterComponent={
              <View style={s.footer}>
                <Pager info={pageInfo} pageSize={pageSize} disabled={isPageLoading} onPage={goToPage} onPageSize={setPageSize} />
              </View>
            }
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.ink} colors={[Colors.accent]} />}
          />
        </ResearcherAsyncState>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },
  footer: { paddingBottom: 20 },

  fill: { flex: 1 },
  hidden: { display: 'none' },
  topBar: { ...wideColumn, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  topBarFloating: { position: 'absolute', left: 0, right: 0, justifyContent: 'flex-end', zIndex: 10, elevation: 10 },
  title: { fontSize: 27, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  segment: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: Colors.border },
  segmentFloating: { backgroundColor: Colors.surface, ...cardShadow },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 13, height: 34 },
  segmentBtnActive: { backgroundColor: Colors.ink },
  segmentText: { fontSize: 13, fontWeight: '700', color: Colors.inkSoft },
  segmentTextActive: { color: Colors.onDark },
  placeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', maxWidth: '100%',
    backgroundColor: Colors.accentTint, borderRadius: 999, borderWidth: 1, borderColor: Colors.accentTintStrong,
    paddingLeft: 11, paddingRight: 8, height: 36, marginBottom: 14,
  },
  placeChipText: { flexShrink: 1, fontSize: 13.5, fontWeight: '700', color: Colors.ink },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.ink, padding: 0 },

  filterRow: { marginBottom: 18 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    ...cardSurface, padding: CARD_PADDING, marginBottom: 11,
  },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardResult: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  cardMeta: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  cardDate: { fontSize: 12, color: Colors.inkDim },

  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
