import { useAuth } from '@/src/auth/AuthContext';
import { DECISIONS, DECISION_LABELS, DecisionType } from '@/src/constants';
import { deleteDecision, getDecisionsByUser, type Decision } from '@/src/database/repositories/decisions';
import { formatCurrency } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setIsLoading(true);
    setLoadError(false);
    try {
      const rows = await getDecisionsByUser(userId);
      setDecisions(rows);
    } catch (err) {
      console.error('Failed to load decision history:', err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  // Refetch every time this tab regains focus (e.g. right after creating a
  // decision on the result screen), not just once on first mount — tab
  // screens stay mounted, so a plain useEffect(..., []) would go stale.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    load({ silent: true });
  };

  const confirmDelete = (decision: Decision) => {
    Alert.alert(
      'Delete decision?',
      `This removes "${decision.result}" from your history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
      <View style={s.header}>
        <Text style={s.title}>Decision History</Text>
        <Text style={s.subtitle}>Everything you've analyzed on this device.</Text>
      </View>

      {isLoading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color="#0A3B28" />
        </View>
      ) : loadError ? (
        <View style={s.centerWrap}>
          <Ionicons name="warning-outline" size={32} color="#C0392B" />
          <Text style={s.emptyText}>Couldn't load your history.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()} activeOpacity={0.8}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : decisions.length === 0 ? (
        <View style={s.centerWrap}>
          <Ionicons name="time-outline" size={40} color="#B0A898" />
          <Text style={s.emptyText}>No decisions yet</Text>
          <Text style={s.emptySubtext}>Decisions you generate will show up here.</Text>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push('/decision-type')}
            activeOpacity={0.8}
          >
            <Text style={s.ctaBtnText}>Make a Decision</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={decisions}
          keyExtractor={d => d.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#0A3B28" />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardIconWrap}>
                <Ionicons name={decisionTypeIcon(item.decision_type)} size={20} color="#0A3B28" />
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardType}>{decisionTypeLabel(item.decision_type)}</Text>
                <Text style={s.cardResult} numberOfLines={1}>{item.result}</Text>
                <View style={s.cardMetaRow}>
                  <Text style={s.cardProfit}>+{formatCurrency(item.profit_increase)}</Text>
                  <Text style={s.cardDate}>{formatDate(item.datetime)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => confirmDelete(item)}
                disabled={deletingId === item.id}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color="#C0392B" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#C0392B" />
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },

  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A3B28' },
  subtitle: { fontSize: 13, color: '#6B7B6E', marginTop: 4 },

  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#0A3B28', marginTop: 4 },
  emptySubtext: { fontSize: 13, color: '#8A8070', textAlign: 'center' },

  retryBtn: {
    marginTop: 8, backgroundColor: '#0A3B28',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  ctaBtn: {
    marginTop: 8, backgroundColor: '#0A3B28',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  ctaBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  list: { padding: 20, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  cardIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#EAF2EC', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardType: { fontSize: 11, fontWeight: '700', color: '#8A8070', letterSpacing: 0.3, textTransform: 'uppercase' },
  cardResult: { fontSize: 16, fontWeight: '700', color: '#0A3B28', marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardProfit: { fontSize: 13, fontWeight: '700', color: '#2E7D52' },
  cardDate: { fontSize: 12, color: '#8A8070' },

  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FBEAEA',
  },
});
