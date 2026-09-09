import { useAuth } from '@/src/auth/AuthContext';
import { Colors } from '@/src/constants/colors';
import { resultCopy as copy } from '@/src/constants/copy';
import { createDecision } from '@/src/database/repositories/decisions';
import { getLocationsByUser } from '@/src/database/repositories/locations';
import { buildOptionClimateFields, Option } from '@/src/database/repositories/options';
import { cltlgy } from '@/src/rcda/constants';
import { expandClimateScenarios, expandScenario5to7, getcltlgyRevised, getIncome, getProfit, getYield } from '@/src/rcda/financials';
import { getCrossOverAverages, getRevisedProfitWalk } from '@/src/rcda/interpolations';
import { transpose2DList } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface RCDAResult {
  recommendedOption: number;       // 0 or 1
  scores: number[];                // one score per option
  label: string;                   // short recommendation label
  summary: string;                 // explanation paragraph
  breakdown: {                     // per-option breakdown rows
    optionIndex: number;
    climateLabel: string;
    netReturn: number;
  }[];
}

function computeResult(params: {
  optionNames: string[];
  yield: number[][];
  cost: number[][];
  addCost: number[][];
  price: number[];
  climate: number[];
}): RCDAResult {

  const transposedYield = expandClimateScenarios(transpose2DList(params.yield));
  const transposedCost = expandClimateScenarios(transpose2DList(params.cost));
  const transposedAddCost = expandClimateScenarios(transpose2DList(params.addCost));

  // Generate baseline financial data
  const yield2 = getYield(transposedYield);
  const income = getIncome(yield2, params.price[0], params.price[1]);
  const profit = getProfit(income, transposedCost, transposedAddCost);

  if (__DEV__) {
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
        `[RCDA] pct=${pct}\tyield=[${yield2[i][0].toFixed(2)}, ${yield2[i][1].toFixed(2)}]`
        + `\tincome=[${income[i][0].toFixed(2)}, ${income[i][1].toFixed(2)}]`
        + `\tprofit=[${profit[i][0].toFixed(2)}, ${profit[i][1].toFixed(2)}]`
      );
    });
    console.log('[RCDA] cltlgyRevised (climate-adjusted percentiles):', getcltlgyRevised(params.climate));
  }

  // Walk profit across the 100 percentiles implied by the user's climate forecast
  const profitWalk = getRevisedProfitWalk(profit, params.climate);
  const [optAve1, optAve2] = getCrossOverAverages(profitWalk);

  if (__DEV__) {
    console.log('[RCDA] ---- summary ----');
    console.log('[RCDA] profitWalk point count:', profitWalk.length);
    console.log('[RCDA] LT averages [option0, option1]:', optAve1, optAve2);
    console.log('[RCDA] recommendedOption:', optAve1 >= optAve2 ? 0 : 1);
  }

  // Determine which option won based on the averages
  const recommendedOption = optAve1 >= optAve2 ? 0 : 1;
  const scores = [Math.round(optAve1), Math.round(optAve2)];

  //  Map data for the UI Breakdown Table
  const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'];
  const breakdown: RCDAResult['breakdown'] = [];

  // Sample indices (0-based) to represent the 5 scenarios across the 100 percentiles
  const sampleIndices = [9, 29, 49, 69, 89];

  params.optionNames.forEach((_, oi) => {
    CLIMATE_LABELS.forEach((cl, ci) => {
      const pointIndex = sampleIndices[ci];
      const netReturn = profitWalk[pointIndex]?.[oi] ?? 0;

      breakdown.push({
        optionIndex: oi,
        climateLabel: cl,
        netReturn: Math.round(netReturn)
      });
    });
  });

  // Return the structured object for the UI
  return {
    recommendedOption,
    scores,
    label: `${params.optionNames[recommendedOption]} is recommended`,
    summary: `Based on the Rapid Climate Decision Analysis, ${params.optionNames[recommendedOption]} yields a higher expected return (₱${scores[recommendedOption].toLocaleString()}/ha) compared to ${params.optionNames[1 - recommendedOption]} (₱${scores[1 - recommendedOption].toLocaleString()}/ha) across the interpolated climate probabilities.`,
    breakdown,
  };
}

const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'];

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
  const [result, setResult] = useState<RCDAResult | null>(null);
  const [computeError, setComputeError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const buildOptionSnapshot = (index: number, userId: string, locationId: string): Option => ({
    id: '',
    option_name: optionNames[index],
    decision_type: decisionType,
    price: priceData[index],
    location_id: locationId,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...buildOptionClimateFields(
      expandScenario5to7(yieldData[index]),
      expandScenario5to7(costData[index]),
      expandScenario5to7(addCostData[index])
    ),
  });


  const saveDecision = async (computed: RCDAResult) => {
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
          profit_increase: Math.abs(computed.scores[0] - computed.scores[1]),
          climate_driest: climate[0],
          climate_mid: climate[1],
          climate_wettest: climate[2],
        },
        firstOption: buildOptionSnapshot(0, userId, locationId),
        secondOption: buildOptionSnapshot(1, userId, locationId),
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
      let computed: RCDAResult;
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

  const startOver = () => router.replace('/(tabs)');

  const handleShare = () => {
    if (!result) return;
    const winner = optionNames[result.recommendedOption];
    Share.share({
      message: `FarmAssist: ${winner} is the better choice — expected +₱${Math.abs(result.scores[0] - result.scores[1]).toLocaleString()}/ha over ${optionNames[1 - result.recommendedOption]}.`,
    }).catch(() => {});
  };

  const renderFallback = (message: string) => (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      <View style={s.banner}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.onDark} />
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
  const favorFlags = result
    ? CLIMATE_LABELS.map(cl => {
      const winnerVal = result.breakdown.find(b => b.optionIndex === result.recommendedOption && b.climateLabel === cl)?.netReturn ?? 0;
      const loserVal = result.breakdown.find(b => b.optionIndex === 1 - result.recommendedOption && b.climateLabel === cl)?.netReturn ?? 0;
      return winnerVal >= loserVal;
    })
    : [];
  const favorCount = favorFlags.filter(Boolean).length;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {!result ? (
        <>
          <View style={s.banner}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.onDark} />
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
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroTopRow}>
              <TouchableOpacity onPress={() => router.back()} style={s.heroBackBtn}>
                <Ionicons name="arrow-back" size={22} color={Colors.onDark} />
              </TouchableOpacity>
              <View style={[s.savedPill, saveError && s.savedPillError]}>
                <Ionicons name={saveError ? 'warning-outline' : 'save-outline'} size={15} color={Colors.onDarkSoft} />
                <Text style={s.savedPillText}>{savedPill}</Text>
              </View>
            </View>

            <Text style={s.answerEyebrow}>{copy.answerEyebrow}</Text>
            <Text style={s.verdict}>{copy.verdict(optionNames[result.recommendedOption])}</Text>
            <View style={s.deltaRow}>
              <Text style={s.deltaValue}>+₱{Math.abs(result.scores[0] - result.scores[1]).toLocaleString()}</Text>
              <Text style={s.deltaUnit}>{copy.perHectare}</Text>
            </View>
            <Text style={s.verdictDetail}>
              {copy.verdictDetail(optionNames[result.recommendedOption], optionNames[1 - result.recommendedOption])}
            </Text>
          </View>

          <View style={s.body}>
            {saveError && (
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

            {/* Expected earnings bars */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{copy.earningsHeading}</Text>
              {optionNames.map((name, i) => {
                const isWinner = i === result.recommendedOption;
                const maxScore = Math.max(...result.scores, 1);
                const pct = Math.max(result.scores[i] / maxScore, 0);
                return (
                  <View key={i} style={s.earningsRow}>
                    <View style={s.earningsTop}>
                      <Text style={[s.earningsName, isWinner && s.earningsNameWinner]}>{name}</Text>
                      <Text style={[s.earningsValue, isWinner && s.earningsValueWinner]}>₱{result.scores[i].toLocaleString()}</Text>
                    </View>
                    <View style={s.earningsBarBg}>
                      <View style={[s.earningsBarFill, { width: `${Math.round(pct * 100)}%` }, isWinner ? s.earningsBarWinner : s.earningsBarLoser]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Keep in mind */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{copy.keepInMindHeading}</Text>
              <Text style={s.keepInMindBody}>
                {copy.keepInMindBody(favorCount, CLIMATE_LABELS.length, optionNames[result.recommendedOption], optionNames[1 - result.recommendedOption])}
              </Text>
              <View style={s.favorRow}>
                {CLIMATE_LABELS.map((cl, i) => (
                  <View key={cl} style={s.favorItem}>
                    <View style={[s.favorIconWrap, favorFlags[i] ? s.favorIconWrapYes : s.favorIconWrapNo]}>
                      <Ionicons name={favorFlags[i] ? 'checkmark' : 'close'} size={17} color={favorFlags[i] ? Colors.accent : Colors.danger} />
                    </View>
                    <Text style={s.favorLabel}>{cl}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Detail table disclosure */}
            <TouchableOpacity style={s.disclosureRow} onPress={() => setShowDetail(v => !v)} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={20} color={Colors.accentSoft} />
              <Text style={s.disclosureText}>{copy.detailTable}</Text>
              <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={19} color={Colors.inkFaint} />
            </TouchableOpacity>

            {showDetail && (
              <View style={s.table}>
                <View style={s.tableRow}>
                  <Text style={[s.tableCell, s.tableHeader, { flex: 1.4 }]}>Climate</Text>
                  {optionNames.map((n, i) => (
                    <Text key={i} style={[s.tableCell, s.tableHeader]} numberOfLines={1}>{n}</Text>
                  ))}
                </View>
                {CLIMATE_LABELS.map((cl, ci) => (
                  <View key={cl} style={[s.tableRow, ci % 2 === 0 && s.tableRowAlt]}>
                    <View style={[s.tableCell, s.climateLabelCell, { flex: 1.4 }]}>
                      <Text style={s.climateCellText}>{cl}</Text>
                    </View>
                    {optionNames.map((_, oi) => {
                      const row = result.breakdown.find(b => b.optionIndex === oi && b.climateLabel === cl);
                      const val = row?.netReturn ?? 0;
                      return (
                        <Text key={oi} style={[s.tableCell, s.tableCellValue, val >= 0 ? s.positiveVal : s.negativeVal]}>
                          {val >= 0 ? '+' : ''}₱{val.toLocaleString()}
                        </Text>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={s.actions}>
              <TouchableOpacity style={s.newComparisonBtn} onPress={startOver} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={16} color={Colors.ink} />
                <Text style={s.newComparisonText}>{copy.newComparison}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={20} color={Colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  banner: {
    backgroundColor: Colors.dark,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onDark },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: Colors.inkSoft },

  scroll: { paddingBottom: 0 },

  // Hero
  hero: { backgroundColor: Colors.dark, paddingTop: 50, paddingHorizontal: 22, paddingBottom: 26, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  heroBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  savedPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  savedPillError: { backgroundColor: 'rgba(192,57,43,0.25)' },
  savedPillText: { fontSize: 12, fontWeight: '600', color: Colors.onDarkSoft },
  answerEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: Colors.onDarkFaint, marginBottom: 10 },
  verdict: { fontSize: 32, fontWeight: '800', color: Colors.onDark, lineHeight: 38, letterSpacing: -0.6 },
  deltaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18, marginBottom: 6 },
  deltaValue: { fontSize: 40, fontWeight: '800', color: Colors.onDarkSoft, lineHeight: 40 },
  deltaUnit: { fontSize: 14, color: Colors.onDarkFaint, paddingBottom: 6 },
  verdictDetail: { fontSize: 15, color: '#C8DFD0', lineHeight: 21 },

  body: { padding: 20, paddingTop: 20 },

  saveErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerBg, borderRadius: 10,
    padding: 10, marginBottom: 14,
  },
  saveErrorText: { fontSize: 12, fontWeight: '600', color: Colors.danger, flex: 1 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.danger },
  retryBtnDisabled: { opacity: 0.6 },
  retryBtnText: { fontSize: 11, fontWeight: '700', color: Colors.onDark },

  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.ink, marginBottom: 14 },

  earningsRow: { marginBottom: 14 },
  earningsTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  earningsName: { fontSize: 15, fontWeight: '600', color: Colors.inkSoft },
  earningsNameWinner: { color: Colors.ink, fontWeight: '800' },
  earningsValue: { fontSize: 15, fontWeight: '700', color: Colors.inkSoft },
  earningsValueWinner: { color: Colors.ink },
  earningsBarBg: { height: 12, backgroundColor: Colors.divider, borderRadius: 6, overflow: 'hidden' },
  earningsBarFill: { height: '100%', borderRadius: 6 },
  earningsBarWinner: { backgroundColor: Colors.accent },
  earningsBarLoser: { backgroundColor: '#C5BFB3' },

  keepInMindBody: { fontSize: 14, color: '#5C6B60', lineHeight: 20, marginBottom: 14 },
  favorRow: { flexDirection: 'row', gap: 6 },
  favorItem: { flex: 1, alignItems: 'center' },
  favorIconWrap: { width: '100%', height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  favorIconWrapYes: { backgroundColor: Colors.accentTint },
  favorIconWrapNo: { backgroundColor: Colors.dangerBg },
  favorLabel: { fontSize: 10, color: Colors.inkFaint, marginTop: 5 },

  disclosureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16, paddingHorizontal: 18,
    marginBottom: 14,
  },
  disclosureText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.ink },

  table: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  tableRowAlt: { backgroundColor: '#F8F5F0' },
  tableCell: { flex: 1, fontSize: 12, color: Colors.ink, textAlign: 'center' },
  tableHeader: { fontWeight: '700', color: Colors.inkFaint, fontSize: 11, letterSpacing: 0.3 },
  climateLabelCell: { justifyContent: 'center' },
  climateCellText: { fontSize: 12, fontWeight: '600', color: Colors.ink, textAlign: 'left' },
  tableCellValue: { fontWeight: '700' },
  positiveVal: { color: Colors.accent },
  negativeVal: { color: Colors.danger },

  actions: { flexDirection: 'row', gap: 10 },
  newComparisonBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surface, borderRadius: 16,
    height: 56, borderWidth: 1.5, borderColor: Colors.borderStrong,
  },
  newComparisonText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  shareBtn: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  startOverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surface, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.borderStrong,
  },
  startOverText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
