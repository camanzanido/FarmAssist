// screens/ResultScreen.tsx
// RESULT — Receives all collected data, calls your RCDA model, displays results.
//
// HOW TO PLUG IN YOUR MODEL:
//   Import your model: import { computeRCDA } from '@/src/models/rcda';
//   Replace the placeholder `computeResult()` function below with your actual call.
//
// DATA SHAPE PASSED IN:
//   optionNames:  string[]      — ['Option A', 'Option B']
//   yieldData:    string[][]    — [5 values for opt0, 5 values for opt1]
//   costData:     string[][]    — same shape
//   addCostData:  string[][]    — same shape
//   priceData:    string[]      — [price_opt0, price_opt1]
//   climate:      number[]      — [vDry%, middle%, vWet%]
import { getIncome, getProfit, getYield } from '@/src/rcda/financials';
import { getCrossOver, incrementProfit, terciles } from '@/src/rcda/model';
import { transpose2DList } from '@/src/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Plug your model in here ────────────────────────────────────────────────
// Replace this with your actual RCDA computation function.
// It receives the same arrays you collect across the wizard.
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

  // 1. Format inputs to match what your TS functions expect
  // Your crop matrix expects format: [ ["Crop A"], ["Crop B"] ]
  const crops = [[params.optionNames[0]], [params.optionNames[1]]];

  // 2. Transpose the matrices
  const transposedYield = transpose2DList(params.yield);
  const transposedCost = transpose2DList(params.cost);
  const transposedAddCost = transpose2DList(params.addCost);

  // 3. Generate baseline financial data
  const yield2 = getYield(transposedYield);
  const income = getIncome(yield2, params.price[0], params.price[1]);
  const profit = getProfit(income, transposedCost, transposedAddCost);

  console.log('Yield:', yield2); // Debug log to inspect yield
  console.log('Income:', income);
  console.log('Profit:', profit);

  // 4. Run the core interpolation engine
  const t = terciles();
  const interpolationData = incrementProfit(
    t,
    yield2,
    params.price[0],
    params.price[1],
    transposedCost,
    transposedAddCost,
    profit,
    crops
  );

  console.log('Interpolation Data:', interpolationData); // Debug log to inspect interpolation output

  // 5. Calculate crossover and find the optimal crop
  const crossOver = getCrossOver(crops, interpolationData);

  console.log('Crossover Data:', crossOver); // Debug log to inspect crossover output

  // crossOver returns: [percentile, [Crop1Name, Ave1, Pct1], [Crop2Name, Ave2, Pct2]]
  const optName1 = crossOver[1][0];
  const optAve1 = crossOver[1][1];
  const optName2 = crossOver[2][0];
  const optAve2 = crossOver[2][1];

  console.log(`Option 1: ${optName1} with average return ₱${optAve1}/ha`);
  console.log(`Option 2: ${optName2} with average return ₱${optAve2}/ha`);
  // Determine which option won based on the averages
  const recommendedOption = optAve1 >= optAve2 ? 0 : 1;
  const scores = [Math.round(optAve1), Math.round(optAve2)];

  // 6. Map data for the UI Breakdown Table
  // interpolationData[3] (arr4) contains the 100-point profit scale.
  // We can sample from it to populate the 5 climate scenarios (V. Dry, Dry, Avg, Wet, V. Wet)
  const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'];
  const breakdown: RCDAResult['breakdown'] = [];

  // Sample indices to represent the 5 scenarios across the 100 points
  const sampleIndices = [10, 30, 50, 70, 90];

  params.optionNames.forEach((_, oi) => {
    CLIMATE_LABELS.forEach((cl, ci) => {
      // arr4 shape is roughly [100 rows][n cols].
      // Option 0 profit is at column 0, Option 1 profit is at column 1
      const pointIndex = sampleIndices[ci];
      const netReturn = interpolationData[3][pointIndex][oi];

      breakdown.push({
        optionIndex: oi,
        climateLabel: cl,
        netReturn: Math.round(netReturn)
      });
    });
  });

  // 7. Return the structured object for the UI
  return {
    recommendedOption,
    scores,
    label: `${params.optionNames[recommendedOption]} is recommended`,
    summary: `Based on the Rapid Climate Decision Analysis, ${params.optionNames[recommendedOption]} yields a higher expected return (₱${scores[recommendedOption].toLocaleString()}/ha) compared to ${params.optionNames[1 - recommendedOption]} (₱${scores[1 - recommendedOption].toLocaleString()}/ha) across the interpolated climate probabilities.`,
    breakdown,
  };
}
// ────────────────────────────────────────────────────────────────────────────

const CLIMATE_COLORS = ['#D4845A', '#C9A85A', '#5A9A6E', '#4A8BBF', '#4A7FB5'];
const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'];

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const decisionType = params.decisionType as string;
  const optionNames = JSON.parse((params.optionNames as string) || '[]');
  const yieldData = JSON.parse((params.yieldData as string) || '[]');
  const costData = JSON.parse((params.costData as string) || '[]');
  const addCostData = JSON.parse((params.addCostData as string) || '[]');
  const priceData = JSON.parse((params.priceData as string) || '[]');
  const climate = JSON.parse((params.climate as string) || '[]');

  const [result, setResult] = useState<RCDAResult | null>(null);

  useEffect(() => {
    // Run computation (wrap in timeout to let loading state render)
    const timer = setTimeout(() => {
      const computed = computeResult({
        optionNames,
        yield: yieldData.map((row: string[]) => row.map(Number)),
        cost: costData.map((row: string[]) => row.map(Number)),
        addCost: addCostData.map((row: string[]) => row.map(Number)),
        price: priceData.map(Number),
        climate,
      });
      setResult(computed);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const startOver = () => router.replace('/(tabs)');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A3B28" />

      {/* Dark green top banner */}
      <View style={s.banner}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.bannerTitle}>Analysis Result</Text>
        <View style={{ width: 40 }} />
      </View>

      {!result ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#0A3B28" />
          <Text style={s.loadingText}>Computing decision…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Recommendation card */}
          <View style={s.recommendCard}>
            <View style={s.recommendBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#5A9A6E" />
              <Text style={s.recommendBadgeText}>RECOMMENDED</Text>
            </View>
            <Text style={s.recommendName}>
              {optionNames[result.recommendedOption]}
            </Text>
            <Text style={s.recommendScore}>
              ₱{result.scores[result.recommendedOption].toLocaleString()}/ha expected return
            </Text>
            <Text style={s.recommendSummary}>{result.summary}</Text>
          </View>

          {/* Score comparison */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Expected Value Comparison</Text>
            {optionNames.map((name: string, i: number) => {
              const isWinner = i === result!.recommendedOption;
              const maxScore = Math.max(...result!.scores);
              const pct = maxScore > 0 ? Math.max(result!.scores[i] / maxScore, 0) : 0;
              return (
                <View key={i} style={[s.scoreRow, isWinner && s.scoreRowWinner]}>
                  <View style={s.scoreTop}>
                    <Text style={[s.scoreName, isWinner && s.scoreNameWinner]}>{name}</Text>
                    <Text style={[s.scoreValue, isWinner && s.scoreValueWinner]}>
                      ₱{result!.scores[i].toLocaleString()}
                    </Text>
                  </View>
                  <View style={s.scoreBarBg}>
                    <View
                      style={[
                        s.scoreBarFill,
                        { width: `${Math.round(pct * 100)}%` },
                        isWinner ? s.scoreBarWinner : s.scoreBarLoser,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Net return breakdown table */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Net Return by Climate Scenario</Text>
            <View style={s.table}>
              {/* Table header */}
              <View style={s.tableRow}>
                <Text style={[s.tableCell, s.tableHeader, { flex: 1.4 }]}>Climate</Text>
                {optionNames.map((n: string, i: number) => (
                  <Text key={i} style={[s.tableCell, s.tableHeader]} numberOfLines={1}>{n}</Text>
                ))}
              </View>
              {CLIMATE_LABELS.map((cl, ci) => (
                <View key={cl} style={[s.tableRow, ci % 2 === 0 && s.tableRowAlt]}>
                  <View style={[s.tableCell, s.climateLabelCell, { flex: 1.4 }]}>
                    <View style={[s.climateDot, { backgroundColor: CLIMATE_COLORS[ci] }]} />
                    <Text style={s.climateCellText}>{cl}</Text>
                  </View>
                  {optionNames.map((_: string, oi: number) => {
                    const row = result!.breakdown.find(
                      b => b.optionIndex === oi && b.climateLabel === cl
                    );
                    const val = row?.netReturn ?? 0;
                    return (
                      <Text
                        key={oi}
                        style={[
                          s.tableCell, s.tableCellValue,
                          val >= 0 ? s.positiveVal : s.negativeVal,
                        ]}
                      >
                        {val >= 0 ? '+' : ''}₱{val.toLocaleString()}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Climate used */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Climate Probabilities Used</Text>
            <View style={s.climateRow}>
              {['V. Dry', 'Middle', 'V. Wet'].map((label, i) => (
                <View key={i} style={s.climatePill}>
                  <Text style={s.climatePillLabel}>{label}</Text>
                  <Text style={s.climatePillValue}>{climate[i]}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.startOverBtn} onPress={startOver} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color="#0A3B28" />
              <Text style={s.startOverText}>New Analysis</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },

  banner: {
    backgroundColor: '#0A3B28',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  loadingText: { fontSize: 14, color: '#6B7B6E' },

  scroll: { padding: 20 },

  recommendCard: {
    backgroundColor: '#0A3B28', borderRadius: 20,
    padding: 22, marginBottom: 20,
  },
  recommendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  recommendBadgeText: {
    fontSize: 11, fontWeight: '800', color: '#5A9A6E', letterSpacing: 1.2,
  },
  recommendName: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4,
  },
  recommendScore: {
    fontSize: 14, color: '#A8D4B4', marginBottom: 12,
  },
  recommendSummary: {
    fontSize: 13, color: '#C8DFD0', lineHeight: 19,
  },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#0A3B28',
    letterSpacing: 0.3, marginBottom: 10,
  },

  scoreRow: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  scoreRowWinner: { borderWidth: 2, borderColor: '#5A9A6E' },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  scoreName: { fontSize: 14, fontWeight: '600', color: '#6B7B6E' },
  scoreNameWinner: { color: '#0A3B28', fontWeight: '800' },
  scoreValue: { fontSize: 14, fontWeight: '700', color: '#6B7B6E' },
  scoreValueWinner: { color: '#0A3B28' },
  scoreBarBg: {
    height: 8, backgroundColor: '#F0EBE0', borderRadius: 4, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreBarWinner: { backgroundColor: '#5A9A6E' },
  scoreBarLoser: { backgroundColor: '#C5BFB3' },

  table: {
    backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  tableRowAlt: { backgroundColor: '#F8F5F0' },
  tableCell: { flex: 1, fontSize: 12, color: '#0A3B28', textAlign: 'center' },
  tableHeader: { fontWeight: '700', color: '#8A8070', fontSize: 11, letterSpacing: 0.3 },
  climateLabelCell: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-start' },
  climateDot: { width: 8, height: 8, borderRadius: 4 },
  climateCellText: { fontSize: 12, fontWeight: '600', color: '#0A3B28' },
  tableCellValue: { fontWeight: '700' },
  positiveVal: { color: '#2E7D52' },
  negativeVal: { color: '#C0392B' },

  climateRow: { flexDirection: 'row', gap: 10 },
  climatePill: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  climatePillLabel: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 0.5, marginBottom: 4 },
  climatePillValue: { fontSize: 18, fontWeight: '800', color: '#0A3B28' },

  actions: { gap: 10 },
  startOverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 14, borderWidth: 1.5, borderColor: '#E0D9CE',
  },
  startOverText: { fontSize: 15, fontWeight: '700', color: '#0A3B28' },
});
