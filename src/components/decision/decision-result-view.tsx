import { OdometerText } from '@/src/components/ui/odometer-text';
import { DECISION_IMAGES, DecisionType } from '@/src/constants';
import { BrandGradient, brandGradientCss, Colors } from '@/src/constants/colors';
import { resultCopy as copy, treeCopy } from '@/src/constants/copy';
import { contentColumn } from '@/src/constants/layout';
import { CLIMATE_LABELS, RcdaSummary } from '@/src/rcda/summary';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecisionTree, formatPeso } from './decision-tree';

interface Props {
  summary: RcdaSummary;
  decisionType?: string;
  /** Row at the top of the hero: back button, status pill, etc. */
  heroTop: ReactNode;
  /** Rendered above the cards, e.g. a save-error banner. */
  banner?: ReactNode;
  /** Rendered below the cards, e.g. action buttons. */
  footer?: ReactNode;
}

const HERO_RATIO = 0.60;
const COLUMN_MAX = 150;
const COLUMN_MIN = 6;

const MASK_LEFT = 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.94) 42%, rgba(255,255,255,0.4) 72%, rgba(255,255,255,0) 100%)';
const MASK_TOP = 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)';
const MASK_BOTTOM = 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)';
const MUTED_COLUMN = `linear-gradient(180deg, ${Colors.barMuted} 0%, ${Colors.divider} 100%)`;

function ScrollHint({ onPress }: { onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [reduceMotion, bob]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <Pressable style={s.hint} onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={copy.seeDetails}>
      <Text style={s.hintText}>{copy.seeDetails}</Text>
      <Animated.View style={bobStyle}>
        <Ionicons name="chevron-down" size={20} color={Colors.inkSoft} />
      </Animated.View>
    </Pressable>
  );
}

function EarningsColumn({ name, score, ratio, highlighted, recommended }: {
  name: string;
  score: number;
  ratio: number;
  highlighted: boolean;
  recommended: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const target = Math.max(COLUMN_MIN, Math.round(ratio * COLUMN_MAX));
  const height = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    height.value = reduceMotion ? target : withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [target, reduceMotion, height]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={s.column}>
      <Text style={[s.columnValue, highlighted && s.columnValueWinner]}>{formatPeso(score)}</Text>
      <View style={s.columnTrack}>
        <Animated.View style={[s.columnBar, highlighted ? s.columnBarWinner : s.columnBarMuted, barStyle]} />
      </View>
      <Text style={[s.columnName, highlighted && s.columnNameWinner]} numberOfLines={2}>{name}</Text>
      {recommended && (
        <View style={s.tag}>
          <Text style={s.tagText}>{copy.recommendedTag}</Text>
        </View>
      )}
    </View>
  );
}

export function DecisionResultView({ summary, decisionType, heroTop, banner, footer }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { optionNames, recommendedOption, bothNegative, scores, breakdown, outcomeFavors, tree } = summary;
  const winner = optionNames[recommendedOption];
  const loser = optionNames[1 - recommendedOption];
  const favorCount = outcomeFavors.filter((o) => o.favorsWinner).length;
  const maxScore = Math.max(...scores, 1);

  const heroHeight = Math.round((height - insets.top) * HERO_RATIO);
  const photo = decisionType ? DECISION_IMAGES[decisionType as DecisionType] : undefined;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={[s.hero, { minHeight: heroHeight }]}>
        {photo && (
          <>
            <Image source={photo} style={[s.photo, { width, height: heroHeight }]} resizeMode="cover" />
            <View style={[s.mask, { width, height: heroHeight }]} />
            <View style={[s.maskTop, { width, height: Math.round(heroHeight * 0.18) }]} />
            <View style={[s.maskBottom, { width, height: Math.round(heroHeight * 0.15) }]} />
          </>
        )}

        <View style={[s.heroInner, { minHeight: heroHeight }]}>
          <View style={s.heroTopRow}>{heroTop}</View>

          <View style={s.verdictBlock}>
            <Text style={s.answerEyebrow}>{copy.answerEyebrow}</Text>
            {bothNegative ? (
              <>
                <Text style={[s.verdict, s.verdictSpaced]}>{copy.bothNegativeVerdict}</Text>
                <Text style={s.verdictDetail}>{copy.bothNegativeDetail(optionNames[0], optionNames[1])}</Text>
              </>
            ) : (
              <>
                <Text style={s.verdict}>{copy.verdict(winner)}</Text>
                <View style={s.deltaRow}>
                  <OdometerText text={`+₱${summary.profitIncrease.toLocaleString()}`} colors={BrandGradient} style={s.deltaValue} />
                  <Text style={s.deltaUnit}>{copy.perHectare}</Text>
                </View>
                <Text style={s.verdictDetail}>{copy.verdictDetail(winner, loser)}</Text>
              </>
            )}
          </View>

          <ScrollHint onPress={() => scrollRef.current?.scrollTo({ y: heroHeight - 24, animated: true })} />
        </View>
      </View>

      <View style={s.body}>
        {banner}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{copy.earningsHeading}</Text>
          <View style={s.columns}>
            {optionNames.map((name, i) => {
              const isWinner = !bothNegative && i === recommendedOption;
              return (
                <EarningsColumn
                  key={i}
                  name={name}
                  score={scores[i]}
                  ratio={Math.max(scores[i] / maxScore, 0)}
                  highlighted={isWinner}
                  recommended={isWinner}
                />
              );
            })}
          </View>
        </View>

        {!bothNegative && (
          <View style={[s.section, s.sectionDivided]}>
            <Text style={s.sectionTitle}>{copy.keepInMindHeading}</Text>
            <Text style={s.keepInMindBody}>
              {copy.keepInMindBody(favorCount, outcomeFavors.length, winner, loser)}
            </Text>
            <View style={s.favorRow}>
              {outcomeFavors.map((o) => (
                <View key={o.key} style={s.favorItem}>
                  <View style={[s.favorIconWrap, o.favorsWinner ? s.favorIconWrapYes : s.favorIconWrapNo]}>
                    <Ionicons name={o.favorsWinner ? 'checkmark' : 'close'} size={17} color={o.favorsWinner ? Colors.accent : Colors.danger} />
                  </View>
                  <Text style={s.favorLabel}>{treeCopy.outcomes[o.key]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Animated.View layout={LinearTransition.duration(220)} style={s.sectionDivided}>
          <TouchableOpacity
            style={s.disclosureRow}
            onPress={() => setShowDetail(v => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetail }}
          >
            <Ionicons name="git-branch-outline" size={20} color={Colors.accentSoft} />
            <Text style={s.disclosureText}>{showDetail ? copy.hideBreakdown : copy.fullBreakdown}</Text>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={19} color={Colors.inkFaint} />
          </TouchableOpacity>

          {showDetail && (
            <Animated.View entering={FadeIn.duration(220)}>
              <DecisionTree tree={tree} bare />

              <Text style={s.tableTitle}>{copy.detailTable}</Text>
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
                          {val > 0 ? '+' : ''}{formatPeso(val)}
                        </Text>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        <View style={s.disclaimer} accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={18} color={Colors.inkFaint} />
          <Text style={s.disclaimerText}>{copy.disclaimer}</Text>
        </View>

        {footer}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 0 },

  hero: { backgroundColor: Colors.surface, overflow: 'hidden' },
  photo: { position: 'absolute', top: 0, left: 0 },
  mask: { position: 'absolute', top: 0, left: 0, experimental_backgroundImage: MASK_LEFT },
  maskTop: { position: 'absolute', top: 0, left: 0, experimental_backgroundImage: MASK_TOP },
  maskBottom: { position: 'absolute', bottom: 0, left: 0, experimental_backgroundImage: MASK_BOTTOM },
  heroInner: { ...contentColumn, flex: 1, paddingTop: 16, paddingHorizontal: 22, paddingBottom: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verdictBlock: { flex: 1, justifyContent: 'flex-end', maxWidth: '64%', paddingBottom: 28 },
  answerEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: Colors.accent, marginBottom: 10 },
  verdict: { fontSize: 32, fontWeight: '800', color: Colors.ink, lineHeight: 38, letterSpacing: -0.6 },
  deltaRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 18, marginBottom: 6 },
  deltaValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  deltaUnit: { fontSize: 14, color: Colors.inkSoft, paddingBottom: 8 },
  verdictSpaced: { marginBottom: 12 },
  verdictDetail: { fontSize: 15, color: Colors.inkMuted, lineHeight: 21 },

  hint: { alignSelf: 'center', alignItems: 'center', gap: 2 },
  hintText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: Colors.inkSoft },

  body: { ...contentColumn, paddingHorizontal: 22, paddingTop: 8 },

  section: { paddingVertical: 20 },
  sectionDivided: { borderTopWidth: 1, borderTopColor: Colors.divider },
  disclaimer: { flexDirection: 'row', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16 },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.inkMuted },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.ink, marginBottom: 16 },

  columns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 36 },
  column: { width: 110, alignItems: 'center' },
  columnValue: { fontSize: 15, fontWeight: '700', color: Colors.inkSoft, marginBottom: 8 },
  columnValueWinner: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  columnTrack: { height: COLUMN_MAX, justifyContent: 'flex-end' },
  columnBar: { width: 64, borderRadius: 12 },
  columnBarWinner: { experimental_backgroundImage: brandGradientCss(180) },
  columnBarMuted: { experimental_backgroundImage: MUTED_COLUMN },
  columnName: { fontSize: 14, fontWeight: '600', color: Colors.inkSoft, marginTop: 10, textAlign: 'center' },
  columnNameWinner: { fontWeight: '800', color: Colors.ink },
  tag: { marginTop: 6, backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', color: Colors.accent },

  keepInMindBody: { fontSize: 14, color: Colors.inkMuted, lineHeight: 20, marginBottom: 14 },
  favorRow: { flexDirection: 'row', gap: 6 },
  favorItem: { flex: 1, alignItems: 'center' },
  favorIconWrap: { width: '100%', height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  favorIconWrapYes: { backgroundColor: Colors.accentTint },
  favorIconWrapNo: { backgroundColor: Colors.dangerBg },
  favorLabel: { fontSize: 11, color: Colors.inkFaint, marginTop: 5 },

  disclosureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  disclosureText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.ink },

  tableTitle: { fontSize: 14, fontWeight: '800', color: Colors.ink, marginBottom: 10 },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillError: { backgroundColor: Colors.dangerBg },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
});
