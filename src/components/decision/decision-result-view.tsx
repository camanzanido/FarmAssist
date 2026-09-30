import { GradientText } from '@/src/components/ui/gradient-text';
import { BrandGradient, cardShadow, Colors } from '@/src/constants/colors';
import { contentColumn } from '@/src/constants/layout';
import { resultCopy as copy } from '@/src/constants/copy';
import { CLIMATE_LABELS, RcdaSummary } from '@/src/rcda/summary';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DecisionTree } from './decision-tree';

interface Props {
  summary: RcdaSummary;
  /** Row at the top of the hero: back button, status pill, etc. */
  heroTop: ReactNode;
  /** Rendered above the cards, e.g. a save-error banner. */
  banner?: ReactNode;
  /** Rendered below the cards, e.g. action buttons. */
  footer?: ReactNode;
}

export function DecisionResultView({ summary, heroTop, banner, footer }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { optionNames, recommendedOption, scores, breakdown, favorFlags, tree } = summary;
  const winner = optionNames[recommendedOption];
  const loser = optionNames[1 - recommendedOption];
  const favorCount = favorFlags.filter(Boolean).length;
  const maxScore = Math.max(...scores, 1);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroInner}>
          <View style={s.heroTopRow}>{heroTop}</View>
          <Text style={s.answerEyebrow}>{copy.answerEyebrow}</Text>
          <Text style={s.verdict}>{copy.verdict(winner)}</Text>
          <View style={s.deltaRow}>
            <GradientText text={`+₱${summary.profitIncrease.toLocaleString()}`} colors={BrandGradient} style={s.deltaValue} />
            <Text style={s.deltaUnit}>{copy.perHectare}</Text>
          </View>
          <Text style={s.verdictDetail}>{copy.verdictDetail(winner, loser)}</Text>
        </View>
      </View>

      <View style={s.body}>
        {banner}

        {/* Expected earnings bars */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{copy.earningsHeading}</Text>
          {optionNames.map((name, i) => {
            const isWinner = i === recommendedOption;
            const pct = Math.max(scores[i] / maxScore, 0);
            return (
              <View key={i} style={s.earningsRow}>
                <View style={s.earningsTop}>
                  <Text style={[s.earningsName, isWinner && s.earningsNameWinner]}>{name}</Text>
                  <Text style={[s.earningsValue, isWinner && s.earningsValueWinner]}>₱{scores[i].toLocaleString()}</Text>
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
            {copy.keepInMindBody(favorCount, CLIMATE_LABELS.length, winner, loser)}
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

        <DecisionTree tree={tree} />

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
                  const val = breakdown[oi][ci];
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

        {footer}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 0 },

  // Hero
  hero: { backgroundColor: Colors.surface, paddingTop: 16, paddingHorizontal: 22, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  heroInner: contentColumn,
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  answerEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: Colors.accent, marginBottom: 10 },
  verdict: { fontSize: 32, fontWeight: '800', color: Colors.ink, lineHeight: 38, letterSpacing: -0.6 },
  deltaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18, marginBottom: 6 },
  deltaValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  deltaUnit: { fontSize: 14, color: Colors.inkSoft, paddingBottom: 8 },
  verdictDetail: { fontSize: 15, color: Colors.inkMuted, lineHeight: 21 },

  body: { ...contentColumn, padding: 20, paddingTop: 20 },

  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, marginBottom: 14, ...cardShadow },
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
  earningsBarLoser: { backgroundColor: Colors.barMuted },

  keepInMindBody: { fontSize: 14, color: Colors.inkMuted, lineHeight: 20, marginBottom: 14 },
  favorRow: { flexDirection: 'row', gap: 6 },
  favorItem: { flex: 1, alignItems: 'center' },
  favorIconWrap: { width: '100%', height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  favorIconWrapYes: { backgroundColor: Colors.accentTint },
  favorIconWrapNo: { backgroundColor: Colors.dangerBg },
  favorLabel: { fontSize: 10, color: Colors.inkFaint, marginTop: 5 },

  disclosureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 16, paddingHorizontal: 18,
    marginBottom: 14, ...cardShadow,
  },
  disclosureText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.ink },

  table: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  tableRowAlt: { backgroundColor: Colors.surfaceAlt },
  tableCell: { flex: 1, fontSize: 12, color: Colors.ink, textAlign: 'center' },
  tableHeader: { fontWeight: '700', color: Colors.inkFaint, fontSize: 11, letterSpacing: 0.3 },
  climateLabelCell: { justifyContent: 'center' },
  climateCellText: { fontSize: 12, fontWeight: '600', color: Colors.ink, textAlign: 'left' },
  tableCellValue: { fontWeight: '700' },
  positiveVal: { color: Colors.accent },
  negativeVal: { color: Colors.danger },
});

/** Hero-top styles shared by screens that render into `heroTop`. */
export const heroTopStyles = StyleSheet.create({
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillError: { backgroundColor: Colors.dangerBg },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
});
