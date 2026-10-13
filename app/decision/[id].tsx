import { DecisionResultView, heroTopStyles } from '@/src/components/decision/decision-result-view';
import { DECISION_LABELS, DecisionType } from '@/src/constants';
import { Colors } from '@/src/constants/colors';
import { decisionDetailCopy as copy } from '@/src/constants/copy';
import { getDecision } from '@/src/database/repositories/decisions';
import { compareToNormalYear, NormalYearComparison } from '@/src/rcda/baseline';
import { computeRcda, decisionToRcdaInputs, RcdaComputeError } from '@/src/rcda/decisionTree';
import { RcdaSummary, summarizeRcda } from '@/src/rcda/summary';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ResultSkeleton } from '@/src/components/skeletons/app-skeletons';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; canRetry: boolean }
  | { status: 'ready'; summary: RcdaSummary; baseline: NormalYearComparison; decisionType: string; datetime: string };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DecisionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const decision = id ? await getDecision(id) : null;
      if (!decision) {
        setState({ status: 'error', message: copy.notFound, canRetry: false });
        return;
      }
      const inputs = decisionToRcdaInputs(decision);
      if (!inputs) {
        setState({ status: 'error', message: copy.incomplete, canRetry: false });
        return;
      }
      const computation = computeRcda(inputs);
      const summary = summarizeRcda(computation, inputs.optionNames, inputs.climate);
      const baseline = compareToNormalYear(inputs, computation);
      const recomputed = summary.bothNegative ? '' : inputs.optionNames[summary.recommendedOption];
      if (recomputed !== decision.result) {
        console.warn('[decision detail] recomputed result differs from saved result', {
          id, saved: decision.result, recomputed,
        });
      }
      setState({ status: 'ready', summary, baseline, decisionType: decision.decision_type, datetime: decision.datetime });
    } catch (err) {
      if (err instanceof RcdaComputeError) {
        console.warn('[decision detail] saved inputs cannot be recomputed:', err.message);
        setState({ status: 'error', message: copy.cannotRecompute, canRetry: false });
        return;
      }
      console.error('Failed to load decision detail:', err);
      setState({ status: 'error', message: copy.loadError, canRetry: true });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status !== 'ready') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={s.banner}>
          <TouchableOpacity onPress={() => router.back()} style={heroTopStyles.backBtn} accessibilityLabel={copy.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={s.bannerTitle}>{copy.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        {state.status === 'loading' ? (
          <ResultSkeleton withTopRow={false} />
        ) : (
          <View style={s.centerWrap}>
            <Ionicons name="warning-outline" size={32} color={Colors.danger} />
            <Text style={s.message}>{state.message}</Text>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={state.canRetry ? load : () => router.back()}
              activeOpacity={0.8}
            >
              <Text style={s.actionBtnText}>{state.canRetry ? copy.retry : copy.back}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const typeLabel = DECISION_LABELS[state.decisionType as DecisionType] ?? state.decisionType;
  const date = formatDate(state.datetime);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <DecisionResultView
        summary={state.summary}
        baseline={state.baseline}
        decisionType={state.decisionType}
        heroTop={
          <>
            <TouchableOpacity onPress={() => router.back()} style={heroTopStyles.backBtn} accessibilityLabel={copy.back}>
              <Ionicons name="arrow-back" size={22} color={Colors.ink} />
            </TouchableOpacity>
            <View style={heroTopStyles.pill}>
              <Ionicons name="time-outline" size={15} color={Colors.accent} />
              <Text style={heroTopStyles.pillText} numberOfLines={1}>
                {date ? `${typeLabel} · ${date}` : typeLabel}
              </Text>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  banner: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  message: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center' },
  actionBtn: { marginTop: 4, backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  actionBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 13 },
});
