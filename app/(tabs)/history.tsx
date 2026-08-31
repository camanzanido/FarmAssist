import { useAuth } from '@/src/auth/AuthContext';
import { DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { Colors } from '@/src/constants/colors';
import { historyCopy as copy } from '@/src/constants/copy';
import { db } from '@/src/database/powersync/powersync';
import { deleteDecision, getDecisionsByUser, type Decision } from '@/src/database/repositories/decisions';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DECISION_ICONS: Record<DecisionType, keyof typeof Ionicons.glyphMap> =
  Object.fromEntries(DECISIONS.map(d => [d.id, d.icon])) as Record<DecisionType, keyof typeof Ionicons.glyphMap>;

function decisionTypeLabel(type: string): string {
  return DECISION_LABELS[type as DecisionType] ?? type;
}

function decisionTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  return DECISION_ICONS[type as DecisionType] ?? 'help-circle-outline';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DecisionType | 'all'>('all');

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setIsLoading(true);
    setLoadError(false);
    try {
      const rows = await getDecisionsByUser(userId);
      setDecisions(rows);

      const batch = await db.getCrudBatch(1000);
      const pending = new Set(
        (batch?.crud ?? []).filter(e => e.table === 'decisions').map(e => e.id)
      );
      setPendingIds(pending);
    } catch (err) {
      console.error('Failed to load decision history:', err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    load({ silent: true });
  };

  const filtered = useMemo(
    () => (filter === 'all' ? decisions : decisions.filter(d => d.decision_type === filter)),
    [decisions, filter]
  );

  const sections = useMemo(() => {
    const groups = new Map<string, Decision[]>();
    for (const d of filtered) {
      const key = monthKey(d.datetime);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const confirmDelete = (decision: Decision) => {
    Alert.alert(
      copy.deleteTitle,
      copy.deleteBody(decision.result),
      [
        { text: copy.deleteCancel, style: 'cancel' },
        {
          text: copy.deleteConfirm,
          style: 'destructive',
          onPress: async () => {
            setDeletingId(decision.id);
            try {
              await deleteDecision(decision.id);
              setDecisions(prev => prev.filter(d => d.id !== decision.id));
            } catch (err) {
              console.error('Failed to delete decision:', err);
              Alert.alert('Could not delete', 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.header}>
        <Text style={s.title}>{copy.title}</Text>
        <Text style={s.subtitle}>{copy.subtitle(decisions.length)}</Text>
      </View>

      {decisions.length > 0 && (
        <View style={s.filterRow}>
          <TouchableOpacity
            style={[s.chip, filter === 'all' && s.chipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[s.chipText, filter === 'all' && s.chipTextActive]}>{copy.filterAll}</Text>
          </TouchableOpacity>
          {DECISIONS.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[s.chip, filter === d.id && s.chipActive]}
              onPress={() => setFilter(d.id)}
            >
              <Text style={[s.chipText, filter === d.id && s.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={Colors.ink} />
        </View>
      ) : loadError ? (
        <View style={s.centerWrap}>
          <Ionicons name="warning-outline" size={32} color={Colors.danger} />
          <Text style={s.emptyText}>{copy.errorTitle}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()} activeOpacity={0.8}>
            <Text style={s.retryBtnText}>{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : decisions.length === 0 ? (
        <View style={s.centerWrap}>
          <Ionicons name="time-outline" size={40} color={Colors.placeholder} />
          <Text style={s.emptyText}>{copy.emptyTitle}</Text>
          <Text style={s.emptySubtext}>{copy.emptySubtitle}</Text>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push('/decision-type')}
            activeOpacity={0.8}
          >
            <Text style={s.ctaBtnText}>{copy.emptyCta}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={d => d.id}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.ink} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionHeader}>{section.title.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => {
            const isPending = pendingIds.has(item.id);
            return (
              <View style={s.card}>
                <View style={s.cardIconWrap}>
                  <Ionicons name={decisionTypeIcon(item.decision_type)} size={21} color={Colors.ink} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardResult} numberOfLines={1}>{item.result}</Text>
                  <Text style={s.cardType}>{decisionTypeLabel(item.decision_type)}</Text>
                  <View style={s.cardMetaRow}>
                    <Text style={s.cardProfit}>+{formatCurrency(item.profit_increase)}</Text>
                    <Text style={s.cardDate}>{formatDate(item.datetime)}</Text>
                    <View style={[s.syncChip, isPending ? s.syncChipPending : s.syncChipSent]}>
                      <Ionicons
                        name={isPending ? 'cloud-offline-outline' : 'checkmark'}
                        size={11}
                        color={isPending ? Colors.amber : Colors.inkSoft}
                      />
                      <Text style={[s.syncChipText, isPending ? s.syncChipTextPending : s.syncChipTextSent]}>
                        {isPending ? copy.notSent : copy.sent}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId === item.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color={Colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 27, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Colors.inkSoft, marginTop: 3 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  chip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: '#5C6B60' },
  chipTextActive: { color: Colors.onDark, fontWeight: '700' },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '700', color: Colors.ink, marginTop: 4 },
  emptySubtext: { fontSize: 13, color: Colors.inkFaint, textAlign: 'center' },

  retryBtn: { marginTop: 8, backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 13 },

  ctaBtn: { marginTop: 8, backgroundColor: Colors.ink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  ctaBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 14 },

  list: { padding: 22, paddingTop: 8 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.9, color: Colors.inkFaint, marginTop: 18, marginBottom: 10 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, gap: 13,
    marginBottom: 9,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardResult: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  cardType: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' },
  cardProfit: { fontSize: 14, fontWeight: '800', color: Colors.accent },
  cardDate: { fontSize: 12, color: '#A39A8B' },
  syncChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  syncChipPending: { backgroundColor: Colors.amberBg },
  syncChipSent: { backgroundColor: Colors.divider },
  syncChipText: { fontSize: 11, fontWeight: '600' },
  syncChipTextPending: { color: Colors.amber },
  syncChipTextSent: { color: Colors.inkSoft },

  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dangerBg,
  },
});
