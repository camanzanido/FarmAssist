import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { ResearcherColors as C } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import { type Decision } from '@/src/database/repositories/decisions';
import { type Location } from '@/src/database/repositories/locations';
import { deleteDecisionRemote, fetchAllDecisions, fetchAllLocations, fetchAllUsers } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { getActionErrorMessage } from '@/src/utils/errors';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TypeFilter = 'all' | DecisionType;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY = { decisions: [] as Decision[], users: [] as User[], locations: [] as Location[] };

export default function ResearcherDecisionsScreen() {
  const fetchAll = useCallback(async () => {
    const [decisions, users, locations] = await Promise.all([
      fetchAllDecisions(),
      fetchAllUsers(),
      fetchAllLocations(),
    ]);
    return { decisions, users, locations };
  }, []);
  const { data: { decisions, users, locations }, isLoading, error, reload } = useResearcherFetch(fetchAll, EMPTY);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, notify } = useFeedback();

  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const locationsById = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decisions.filter(d => {
      if (typeFilter !== 'all' && d.decision_type !== typeFilter) return false;
      if (!q) return true;
      const farmer = usersById.get(d.user_id);
      const loc = locationsById.get(d.location_id);
      const haystack = [d.result, farmer?.name, farmer?.username, loc?.city, loc?.province]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [decisions, typeFilter, query, usersById, locationsById]);

  const confirmDelete = async (decision: Decision) => {
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
      reload();
      notify.success('Decision removed');
    } catch (err) {
      console.error('Failed to delete decision:', err);
      notify.error('Could not remove decision', getActionErrorMessage(err, 'Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        errorMessage="Couldn't load decisions. Check your connection."
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Decisions</Text>
          <Text style={s.subtitle}>{decisions.length} total</Text>

          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={19} color={C.textFaint} />
            <TextInput
              style={s.searchInput}
              placeholder="Farmer, result, or municipality"
              placeholderTextColor={C.textFaint}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={C.textFaint} />
              </TouchableOpacity>
            )}
          </View>

          <View style={s.filterRow}>
            <TouchableOpacity style={[s.filterChip, typeFilter === 'all' && s.filterChipActive]} onPress={() => setTypeFilter('all')}>
              <Text style={[s.filterChipText, typeFilter === 'all' && s.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {DECISIONS.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[s.filterChip, typeFilter === d.id && s.filterChipActive]}
                onPress={() => setTypeFilter(d.id)}
              >
                <Text style={[s.filterChipText, typeFilter === d.id && s.filterChipTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon={decisions.length === 0 ? 'document-text-outline' : 'search-outline'}
              title={decisions.length === 0 ? 'No decisions recorded yet.' : 'No decisions match this search.'}
              subtitle={decisions.length === 0 ? undefined : 'Try a different search term or type filter.'}
            />
          ) : (
            filtered.map(d => {
              const farmer = usersById.get(d.user_id);
              const loc = locationsById.get(d.location_id);
              return (
                <View key={d.id} style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowResult} numberOfLines={1}>{d.result}</Text>
                    <Text style={s.rowMeta}>
                      {DECISION_LABELS[d.decision_type as DecisionType] ?? d.decision_type}
                      {farmer ? ` · ${farmer.name}` : ''}
                      {loc ? ` · ${loc.city}` : ''}
                    </Text>
                    <View style={s.rowBottomRow}>
                      <Text style={s.rowProfit}>+{formatCurrency(d.profit_increase)}</Text>
                      <Text style={s.rowDate}>{formatDate(d.datetime)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => confirmDelete(d)}
                    disabled={deletingId === d.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </ResearcherAsyncState>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },

  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, color: C.textFaint, marginTop: 3, marginBottom: 16 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, color: C.text },

  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 18, flexWrap: 'wrap' },
  filterChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  filterChipActive: { backgroundColor: C.accentStrong },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  filterChipTextActive: { color: C.accentDeepText, fontWeight: '700' },


  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 9 },
  rowResult: { fontSize: 15.5, fontWeight: '700', color: C.text },
  rowMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 3 },
  rowBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  rowProfit: { fontSize: 13.5, fontWeight: '800', color: C.accent },
  rowDate: { fontSize: 11.5, color: C.textFaint },

  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(224,133,133,0.14)' },
});
