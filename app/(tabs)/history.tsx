import { useAuth } from '@/src/auth/AuthContext';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { DECISIONS, DECISION_ICONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { HistorySkeleton } from '@/src/components/skeletons/app-skeletons';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { PopoverMenu } from '@/src/components/ui/popover-menu';
import { TrashIcon } from '@/src/components/ui/trash-icon';
import { brandGradientSoftCss, CARD_PADDING, cardSurface, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { decisionResultLabel, historyCopy as copy } from '@/src/constants/copy';
import { db } from '@/src/database/powersync/powersync';
import { deleteDecision, getDecisionsByUser, getStagedDecisionIds, type Decision } from '@/src/database/repositories/decisions';
import { ProfitAmount } from '@/src/components/ui/profit-amount';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function timeOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

type RowProps = {
  item: Decision;
  isPending: boolean;
  deleting: boolean;
  onOpen: (id: string) => void;
  onDelete: (decision: Decision) => Promise<void>;
};

// Memoised so opening one row's delete dialog doesn't re-render the rest of the list.
const HistoryRow = memo(function HistoryRow({ item, isPending, deleting, onOpen, onDelete }: RowProps) {
  const [lidOpen, setLidOpen] = useState(false);

  const handleDelete = async () => {
    setLidOpen(true);
    try {
      await onDelete(item);
    } finally {
      setLidOpen(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={() => onOpen(item.id)}
      accessibilityRole="button"
      accessibilityHint={copy.openHint}
    >
      <View style={s.cardMain}>
        <View style={s.cardIconWrap}>
          <Ionicons name={decisionTypeIcon(item.decision_type)} size={21} color={Colors.ink} />
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardResult} numberOfLines={1}>{decisionResultLabel(item.result)}</Text>
          <Text style={s.cardType}>{decisionTypeLabel(item.decision_type)}</Text>
          <View style={s.cardMetaRow}>
            {item.result !== '' && <ProfitAmount value={item.profit_increase} />}
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
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={handleDelete}
        disabled={deleting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={copy.deleteLabel}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={Colors.danger} />
        ) : (
          <TrashIcon size={21} color={Colors.danger} open={lidOpen} />
        )}
      </TouchableOpacity>
    </Pressable>
  );
});

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, notify } = useFeedback();
  const userId = user?.id ?? '';

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filter, setFilter] = useState<DecisionType | 'all'>('all');

  const hasLoaded = useRef(false);

  // Only the first load shows the skeleton; revisiting the tab refreshes in place.
  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent && !hasLoaded.current) setIsLoading(true);
    setLoadError(false);
    try {
      const rows = await getDecisionsByUser(userId);
      setDecisions(rows);

      const batch = await db.getCrudBatch(1000);
      const pending = new Set(
        (batch?.crud ?? []).filter(e => e.table === 'decisions').map(e => e.id)
      );
      for (const id of await getStagedDecisionIds()) pending.add(id);
      setPendingIds(pending);
    } catch (err) {
      console.error('Failed to load decision history:', err);
      setLoadError(true);
    } finally {
      hasLoaded.current = true;
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

  const filtered = useMemo(() => {
    const rows = filter === 'all' ? decisions : decisions.filter(d => d.decision_type === filter);
    const sign = sortOrder === 'newest' ? -1 : 1;
    return [...rows].sort((a, b) => sign * (timeOf(a.datetime) - timeOf(b.datetime)));
  }, [decisions, filter, sortOrder]);

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: copy.filterAll },
      ...DECISIONS.map(d => ({ value: d.id, label: d.label })),
    ],
    []
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

  const openDecision = useCallback(
    (id: string) => router.push({ pathname: '/decision/[id]', params: { id } }),
    [router]
  );

  const confirmDelete = useCallback(async (decision: Decision) => {
    const confirmed = await confirm({
      title: copy.deleteTitle,
      message: copy.deleteBody(decisionResultLabel(decision.result)),
      confirmText: copy.deleteConfirm,
      cancelText: copy.deleteCancel,
      tone: 'destructive',
      icon: 'trash-outline',
    });
    if (!confirmed) return;

    setDeletingId(decision.id);
    try {
      await deleteDecision(decision.id);
      setDecisions(prev => prev.filter(d => d.id !== decision.id));
      notify.success(copy.deletedToast);
    } catch (err) {
      console.error('Failed to delete decision:', err);
      notify.error(copy.deleteFailedTitle, copy.deleteFailedBody);
    } finally {
      setDeletingId(null);
    }
  }, [confirm, notify]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{copy.title}</Text>
          <Text style={s.subtitle}>{copy.subtitle(decisions.length)}</Text>
        </View>
      </View>

      {decisions.length > 0 && (
        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <AnimatedFilterBar
              options={filterOptions}
              selected={filter}
              onSelect={setFilter}
              style={s.filterContent}
            />
          </View>
          {decisions.length > 1 && (
            <PopoverMenu
              icon="filter-outline"
              style={s.sortBtn}
              accessibilityLabel={copy.sortLabel}
              items={[
                { key: 'newest', label: copy.sortNewest, icon: 'arrow-down-outline', selected: sortOrder === 'newest', onPress: () => setSortOrder('newest') },
                { key: 'oldest', label: copy.sortOldest, icon: 'arrow-up-outline', selected: sortOrder === 'oldest', onPress: () => setSortOrder('oldest') },
              ]}
            />
          )}
        </View>
      )}

      {isLoading ? (
        <HistorySkeleton withHeader={false} />
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
            <Text style={s.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <HistoryRow
              item={item}
              isPending={pendingIds.has(item.id)}
              deleting={deletingId === item.id}
              onOpen={openDecision}
              onDelete={confirmDelete}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { ...contentColumn, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 27, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Colors.inkSoft, marginTop: 3 },

  filterRow: { ...contentColumn, flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  filterContent: { paddingLeft: 24, paddingRight: 12 },
  sortBtn: { marginRight: 18 },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '700', color: Colors.ink, marginTop: 4 },
  emptySubtext: { fontSize: 13, color: Colors.inkFaint, textAlign: 'center' },

  retryBtn: { marginTop: 8, backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 13 },

  ctaBtn: { marginTop: 8, backgroundColor: Colors.ink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  ctaBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 14 },

  list: { ...contentColumn, padding: 22, paddingTop: 8 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: Colors.inkFaint, marginTop: 18, marginBottom: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    ...cardSurface,
    padding: CARD_PADDING, gap: 13,
    marginBottom: 11,
  },
  cardPressed: { experimental_backgroundImage: brandGradientSoftCss(135), borderColor: Colors.accentTintStrong },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13 },
  cardIconWrap: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardResult: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  cardType: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' },
  cardDate: { fontSize: 12, color: Colors.inkDim },
  syncChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  syncChipPending: { backgroundColor: Colors.amberBg },
  syncChipSent: { backgroundColor: Colors.divider },
  syncChipText: { fontSize: 11, fontWeight: '600' },
  syncChipTextPending: { color: Colors.amber },
  syncChipTextSent: { color: Colors.inkSoft },

  deleteBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
});
