import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { Pager } from '@/src/components/researcher/pager';
import { ListRowsSkeleton, ListScreenSkeleton } from '@/src/components/researcher/skeletons';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { cardShadow, Colors } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import { deleteDecisionRemote, fetchDecisionsPage, type ResearcherDecisionRow } from '@/src/database/repositories/researcher';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherPage } from '@/src/hooks/use-researcher-page';
import { getActionErrorMessage } from '@/src/utils/errors';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TypeFilter = 'all' | DecisionType;

const DECISION_ICONS = Object.fromEntries(DECISIONS.map(d => [d.id, d.icon])) as Record<DecisionType, keyof typeof Ionicons.glyphMap>;

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
        <Text style={s.cardResult} numberOfLines={1}>{d.result}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>
          {DECISION_LABELS[d.decision_type as DecisionType] ?? d.decision_type}
          {d.farmer_name ? ` · ${d.farmer_name}` : ''}
          {d.city ? ` · ${d.city}` : ''}
        </Text>
        <View style={s.cardMetaRow}>
          <Text style={s.cardProfit}>+{formatCurrency(d.profit_increase)}</Text>
          <Text style={s.cardDate}>{formatDate(d.datetime)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(d)}
        disabled={isDeleting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Remove ${d.result}`}
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
  const listRef = useRef<FlatList<ResearcherDecisionRow>>(null);
  const { confirm, notify } = useFeedback();

  const debouncedQuery = useDebouncedValue(query.trim());
  const filters = useMemo(
    () => ({ type: typeFilter === 'all' ? null : typeFilter, query: debouncedQuery }),
    [typeFilter, debouncedQuery]
  );
  const {
    rows, pageInfo, pageSize, isLoading, isPageLoading, isRefreshing, error, setPage, setPageSize, reload, refresh, retry,
  } = useResearcherPage(fetchDecisionsPage, filters);

  const filterOptions = useMemo(
    () => [{ value: 'all' as const, label: 'All' }, ...DECISIONS.map(d => ({ value: d.id, label: d.label }))],
    []
  );
  const isFiltered = typeFilter !== 'all' || debouncedQuery.length > 0;

  const goToPage = (p: number) => {
    setPage(p);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const confirmDelete = async (decision: ResearcherDecisionRow) => {
    const confirmed = await confirm({
      title: 'Remove this decision?',
      message: `This permanently deletes "${decision.result}" from the database. This can't be undone.`,
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
      <View style={s.header}>
        <Text style={s.title}>Decisions</Text>
        <Text style={s.subtitle}>
          {isFiltered ? `${pageInfo.total.toLocaleString()} match` : `${pageInfo.total.toLocaleString()} total`}
        </Text>
      </View>

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
      subtitle={isFiltered ? 'Try a different search term or type filter.' : undefined}
    />
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },
  footer: { paddingBottom: 20 },

  header: { marginBottom: 16 },
  title: { fontSize: 27, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Colors.inkSoft, marginTop: 3 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.ink, padding: 0 },

  filterRow: { marginBottom: 18 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 13,
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 11, ...cardShadow,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardResult: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  cardMeta: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  cardProfit: { fontSize: 14, fontWeight: '800', color: Colors.accent },
  cardDate: { fontSize: 12, color: Colors.inkDim },

  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dangerBg },
});
