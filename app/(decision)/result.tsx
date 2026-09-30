import { useAuth } from '@/src/auth/AuthContext';
import { DecisionResultView, heroTopStyles } from '@/src/components/decision/decision-result-view';
import { Colors } from '@/src/constants/colors';
import { resultCopy as copy } from '@/src/constants/copy';
import { createDecision, OptionSnapshot } from '@/src/database/repositories/decisions';
import { getLocationsByUser } from '@/src/database/repositories/locations';
import { buildOptionClimateFields } from '@/src/database/climateFields';
import { cltlgy } from '@/src/rcda/constants';
import { computeRcda, RcdaInputs } from '@/src/rcda/decisionTree';
import { expandScenario5to7, getcltlgyRevised } from '@/src/rcda/financials';
import { RcdaSummary, summarizeRcda } from '@/src/rcda/summary';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function computeResult(params: RcdaInputs): RcdaSummary {
  // Shared pipeline (also used by the decision tree and History detail)
  const computation = computeRcda(params);

  if (__DEV__) {
    const { profit, profitWalk, averages, recommendedOption } = computation;
    const [driest, mid, wettest] = params.climate;
    console.log('[RCDA] ---- inputs ----');
    console.log('[RCDA] optionNames:', params.optionNames);
    console.log('[RCDA] price:', params.price);
    console.log('[RCDA] climate [driest, mid, wettest]:', driest, mid, wettest);
    console.log('[RCDA] raw yield (per option, 5 scenarios):', params.yield);
    console.log('[RCDA] raw cost (per option, 5 scenarios):', params.cost);
    console.log('[RCDA] raw addCost (per option, 5 scenarios):', params.addCost);

    console.log('[RCDA] ---- 7-point interpolation (cltlgy = [1,10,33,50,67,90,100]) ----');
    cltlgy.forEach((pct, i) => {
      console.log(
        `[RCDA] pct=${pct}`
        + `\tprofit=[${profit[i][0].toFixed(2)}, ${profit[i][1].toFixed(2)}]`
      );
    });
    console.log('[RCDA] cltlgyRevised (climate-adjusted percentiles):', getcltlgyRevised(params.climate));

    console.log('[RCDA] ---- summary ----');
    console.log('[RCDA] profitWalk point count:', profitWalk.length);
    console.log('[RCDA] LT averages [option0, option1]:', averages[0], averages[1]);
    console.log('[RCDA] recommendedOption:', recommendedOption);
  }

  return summarizeRcda(computation, params.optionNames, params.climate);
}

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let decisionType = '';
  let optionNames: string[] = [];
  let yieldData: number[][] = [];
  let costData: number[][] = [];
  let addCostData: number[][] = [];
  let priceData: number[] = [];
  let climate: number[] = [];
  let paramsError = false;

  try {
    decisionType = params.decisionType as string;
    optionNames = JSON.parse((params.optionNames as string) || '[]');
    yieldData = JSON.parse((params.yieldData as string) || '[]').map((row: string[]) => row.map(Number));
    costData = JSON.parse((params.costData as string) || '[]').map((row: string[]) => row.map(Number));
    addCostData = JSON.parse((params.addCostData as string) || '[]').map((row: string[]) => row.map(Number));
    priceData = JSON.parse((params.priceData as string) || '[]').map(Number);
    climate = JSON.parse((params.climate as string) || '[]').map(Number);
  } catch (err) {
    console.error('Failed to parse decision params:', err);
    paramsError = true;
  }

  const { user } = useAuth();
  const [result, setResult] = useState<RcdaSummary | null>(null);
  const [computeError, setComputeError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const buildOptionSnapshot = (index: number): OptionSnapshot => ({
    option_name: optionNames[index],
    price: priceData[index],
    ...buildOptionClimateFields(
      expandScenario5to7(yieldData[index]),
      expandScenario5to7(costData[index]),
      expandScenario5to7(addCostData[index])
    ),
  });


  const saveDecision = async (computed: RcdaSummary) => {
    setIsSaving(true);
    try {
      const userId = user?.id ?? '';
      const userLocations = userId ? await getLocationsByUser(userId) : [];
      const locationId = userLocations[0]?.id ?? '';

      await createDecision({
        decision: {
          decision_type: decisionType,
          location_id: locationId,
          user_id: userId,
          result: optionNames[computed.recommendedOption],
          profit_increase: computed.profitIncrease,
          climate_driest: climate[0],
          climate_mid: climate[1],
          climate_wettest: climate[2],
        },
        firstOption: buildOptionSnapshot(0),
        secondOption: buildOptionSnapshot(1),
      });
      setSaveError(false);
    } catch (err) {
      console.error('Failed to save decision:', err);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (paramsError) return; // nothing valid to compute from

    // Run computation (wrap in timeout to let loading state render)
    const timer = setTimeout(async () => {
      let computed: RcdaSummary;
      try {
        computed = computeResult({
          optionNames,
          yield: yieldData,
          cost: costData,
          addCost: addCostData,
          price: priceData,
          climate,
        });
      } catch (err) {
        console.error('Failed to compute decision result:', err);
        setComputeError(true);
        return;
      }
      setResult(computed);
      await saveDecision(computed);
    }, 600);
    return () => clearTimeout(timer);
  }, []);


  const startOver = () => router.dismissTo('/(tabs)');

  const renderFallback = (message: string) => (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={s.banner}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={s.bannerTitle}>Analysis Result</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.loadingWrap}>
        <Ionicons name="warning-outline" size={32} color={Colors.danger} />
        <Text style={s.loadingText}>{message}</Text>
        <TouchableOpacity style={s.startOverBtn} onPress={startOver} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color={Colors.ink} />
          <Text style={s.startOverText}>New Analysis</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (paramsError) {
    return renderFallback(copy.paramsError);
  }

  if (computeError) {
    return renderFallback(copy.computeError);
  }

  const savedPill = isSaving ? copy.savingPill : saveError ? copy.notSavedPill : copy.savedPill;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {!result ? (
        <>
          <View style={s.banner}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.ink} />
            </TouchableOpacity>
            <Text style={s.bannerTitle}>Analysis Result</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.ink} />
            <Text style={s.loadingText}>{copy.loading}</Text>
          </View>
        </>
      ) : (
        <DecisionResultView
          summary={result}
          heroTop={
            <>
              <TouchableOpacity onPress={() => router.back()} style={heroTopStyles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={Colors.ink} />
              </TouchableOpacity>
              <View style={[heroTopStyles.pill, saveError && heroTopStyles.pillError]}>
                <Ionicons name={saveError ? 'warning-outline' : 'save-outline'} size={15} color={Colors.accent} />
                <Text style={heroTopStyles.pillText}>{savedPill}</Text>
              </View>
            </>
          }
          banner={saveError && (
            <View style={s.saveErrorBanner}>
              <Ionicons name="warning-outline" size={16} color={Colors.danger} />
              <Text style={s.saveErrorText}>{copy.saveErrorBanner}</Text>
              <TouchableOpacity
                style={[s.retryBtn, isSaving && s.retryBtnDisabled]}
                onPress={() => result && saveDecision(result)}
                disabled={isSaving}
              >
                <Text style={s.retryBtnText}>{isSaving ? copy.retrying : copy.retry}</Text>
              </TouchableOpacity>
            </View>
          )}
          footer={
            <View style={s.actions}>
              <TouchableOpacity style={s.newComparisonBtn} onPress={startOver} activeOpacity={0.8}>
                <Ionicons name="home-outline" size={16} color={Colors.ink} />
                <Text style={s.newComparisonText}>{copy.newComparison}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  banner: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accentTint,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: Colors.inkSoft },

  saveErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerBg, borderRadius: 10,
    padding: 10, marginBottom: 14,
  },
  saveErrorText: { fontSize: 12, fontWeight: '600', color: Colors.danger, flex: 1 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.danger },
  retryBtnDisabled: { opacity: 0.6 },
  retryBtnText: { fontSize: 11, fontWeight: '700', color: Colors.onDark },

  actions: { flexDirection: 'row', gap: 10 },
  newComparisonBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surface, borderRadius: 16,
    height: 56, borderWidth: 1.5, borderColor: Colors.borderStrong,
  },
  newComparisonText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  startOverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surface, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.borderStrong,
  },
  startOverText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
