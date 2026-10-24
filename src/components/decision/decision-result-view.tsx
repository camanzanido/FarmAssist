import { OdometerText } from '@/src/components/ui/odometer-text';
import { DECISION_IMAGES, DecisionType } from '@/src/constants';
import { BrandGradient, brandGradientCss, cardShadow, Colors, ForecastColors } from '@/src/constants/colors';
import { resultCopy as copy, treeCopy } from '@/src/constants/copy';
import { contentColumn } from '@/src/constants/layout';
import type { NormalYearComparison } from '@/src/rcda/baseline';
import type { RcdaSummary } from '@/src/rcda/summary';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DecisionTree, formatPeso } from './decision-tree';
import { ForecastDonut } from './forecast-donut';

interface Props {
  summary: RcdaSummary;
  baseline?: NormalYearComparison | null;
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
          <Text style={s.tagText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{copy.recommendedTag}</Text>
        </View>
      )}
    </View>
  );
}

function NormalBetterNote({ name, gain }: { name: string; gain: number }) {
  return (
    <View style={s.normalBetter}>
      <Ionicons name="trending-up" size={16} color={Colors.inkSoft} />
      <Text style={s.normalBetterText}>{copy.heroNormalBetter(name, formatPeso(gain))}</Text>
    </View>
  );
}

function EarningsGroup({ caption, names, scores, maxScore, winner, showTag }: {
  caption: string;
  names: string[];
  scores: number[];
  maxScore: number;
  winner: number | null;
  showTag: boolean;
}) {
  return (
    <View style={s.earningsGroup}>
      <View style={s.groupCaption}>
        <Text style={s.groupCaptionText}>{caption}</Text>
      </View>
      <View style={s.columns}>
        {names.map((name, i) => (
          <EarningsColumn
            key={i}
            name={name}
            score={scores[i]}
            ratio={Math.max(scores[i] / maxScore, 0)}
            highlighted={i === winner}
            recommended={showTag && i === winner}
          />
        ))}
      </View>
    </View>
  );
}

const FORECAST_SEGMENTS = [
  { key: 'dry', color: ForecastColors.dry },
  { key: 'average', color: ForecastColors.average },
  { key: 'wet', color: ForecastColors.wet },
] as const;

function NormalYearSection({ baseline, optionNames, bothNegative }: {
  baseline: NormalYearComparison;
  optionNames: string[];
  bothNegative: boolean;
}) {
  const name = optionNames[baseline.focusOption];
  const amount = formatPeso(Math.abs(baseline.delta));
  let main: string;
  if (baseline.forecastIsNormal) main = copy.normalYearSame;
  else if (baseline.delta > 0) main = copy.normalYearBetter(name, amount);
  else if (baseline.delta < 0) main = copy.normalYearWorse(name, amount);
  else main = copy.normalYearEven(name);

  let extra: string | null = null;
  if (!baseline.forecastIsNormal) {
    if (baseline.normalBothNegative) extra = bothNegative ? null : copy.normalYearNoProfit;
    else if (bothNegative || baseline.normalRecommended !== baseline.focusOption) extra = copy.normalYearOtherPick(optionNames[baseline.normalRecommended]);
  }

  const tone = baseline.forecastIsNormal || baseline.delta === 0 ? null : baseline.delta > 0 ? 'up' : 'down';

  return (
    <View style={[s.section, s.sectionDivided]}>
      <Text style={s.sectionTitle}>{copy.normalYearHeading}</Text>
      <View style={s.donutRow}>
        {[
          { label: copy.normalYearYourForecast, split: baseline.forecast },
          { label: copy.normalYearNormal, split: baseline.normal },
        ].map(d => (
          <View key={d.label} style={s.donutItem}>
            <ForecastDonut driest={d.split[0]} wettest={d.split[2]} size={132} stroke={20} />
            <Text style={s.donutLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={s.legendRow}>
        {FORECAST_SEGMENTS.map(seg => (
          <View key={seg.key} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
            <Text style={s.legendText}>{copy.normalYearLegend[seg.key]}</Text>
          </View>
        ))}
      </View>
      <View style={[s.normalNote, tone === 'up' && s.normalNoteUp, tone === 'down' && s.normalNoteDown]}>
        <Ionicons
          name={tone === 'up' ? 'trending-up' : tone === 'down' ? 'trending-down' : 'remove'}
          size={20}
          color={tone === 'down' ? Colors.danger : Colors.accent}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.normalNoteText}>{main}</Text>
          {extra && <Text style={s.normalNoteExtra}>{extra}</Text>}
        </View>
      </View>
    </View>
  );
}

export function DecisionResultView({ summary, baseline, decisionType, heroTop, banner, footer }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { optionNames, recommendedOption, bothNegative, scores, outcomeFavors, tree } = summary;
  const winner = optionNames[recommendedOption];
  const loser = optionNames[1 - recommendedOption];
  const favorCount = outcomeFavors.filter((o) => o.favorsWinner).length;
  const showNormal = !!baseline && !baseline.forecastIsNormal;
  const maxScore = Math.max(...scores, ...(showNormal ? baseline!.normalScores : []), 1);
  const bestNormal = showNormal ? baseline!.normalScores[baseline!.normalRecommended] : 0;
  const normalGain = showNormal && !baseline!.normalBothNegative ? bestNormal - Math.max(...scores) : 0;

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
                {normalGain > 0 && <NormalBetterNote name={optionNames[baseline!.normalRecommended]} gain={normalGain} />}
              </>
            ) : (
              <>
                <Text style={s.verdict}>{copy.verdict(winner)}</Text>
                <View style={s.deltaRow}>
                  <View style={s.deltaAmount}>
                    <Ionicons name="arrow-up" size={34} color={Colors.accent} />
                    <OdometerText text={`₱${summary.profitIncrease.toLocaleString()}`} colors={BrandGradient} style={s.deltaValue} />
                  </View>
                  <Text style={s.deltaUnit}>{copy.perHectare}</Text>
                </View>
                <Text style={s.verdictDetail}>{copy.verdictDetail(winner, loser)}</Text>
                {normalGain > 0 && <NormalBetterNote name={optionNames[baseline!.normalRecommended]} gain={normalGain} />}
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
          <View style={s.earningsRow}>
            <EarningsGroup
              caption={baseline?.forecastIsNormal ? copy.earningsSameAsNormal : copy.earningsForecast}
              names={optionNames}
              scores={scores}
              maxScore={maxScore}
              winner={bothNegative ? null : recommendedOption}
              showTag
            />
            {showNormal && (
              <EarningsGroup
                caption={copy.earningsNormal}
                names={optionNames}
                scores={baseline!.normalScores}
                maxScore={maxScore}
                winner={baseline!.normalBothNegative ? null : baseline!.normalRecommended}
                showTag={false}
              />
            )}
          </View>
        </View>

        {baseline && <NormalYearSection baseline={baseline} optionNames={optionNames} bothNegative={bothNegative} />}

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
  answerEyebrow: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 10 },
  verdict: { fontSize: 32, fontWeight: '800', color: Colors.ink, lineHeight: 38, letterSpacing: -0.6 },
  deltaRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 18, marginBottom: 6 },
  deltaAmount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  deltaUnit: { fontSize: 14, color: Colors.inkSoft, paddingBottom: 8 },
  verdictSpaced: { marginBottom: 12 },
  verdictDetail: { fontSize: 15, color: Colors.inkMuted, lineHeight: 21 },
  normalBetter: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
  normalBetterText: { flex: 1, fontSize: 13, lineHeight: 18, color: Colors.inkSoft },

  hint: { alignSelf: 'center', alignItems: 'center', gap: 2 },
  hintText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: Colors.inkSoft },

  body: { ...contentColumn, paddingHorizontal: 22, paddingTop: 8 },

  section: { paddingVertical: 20 },
  sectionDivided: { borderTopWidth: 1, borderTopColor: Colors.divider },
  disclaimer: { flexDirection: 'row', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16 },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.inkMuted },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.ink, marginBottom: 16 },

  // Forecast and normal-year groups sit side by side on one shared scale.
  earningsRow: { flexDirection: 'row', gap: 12 },
  earningsGroup: { flex: 1, marginBottom: 8 },
  groupCaption: { alignSelf: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 14 },
  groupCaptionText: { fontSize: 12, fontWeight: '700', color: Colors.inkSoft, textAlign: 'center' },
  columns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10 },
  column: { flex: 1, maxWidth: 104, alignItems: 'center' },
  columnValue: { fontSize: 13, fontWeight: '700', color: Colors.inkSoft, marginBottom: 8, fontVariant: ['tabular-nums'] },
  columnValueWinner: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  columnTrack: { height: COLUMN_MAX, justifyContent: 'flex-end' },
  columnBar: { width: 44, borderRadius: 10 },
  columnBarWinner: { experimental_backgroundImage: brandGradientCss(180) },
  columnBarMuted: { experimental_backgroundImage: MUTED_COLUMN },
  columnName: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginTop: 10, textAlign: 'center' },
  columnNameWinner: { fontWeight: '800', color: Colors.ink },
  tag: { marginTop: 6, maxWidth: '100%', backgroundColor: Colors.accentTint, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', color: Colors.accent },

  donutRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  donutItem: { alignItems: 'center', gap: 8 },
  donutLabel: { fontSize: 13, fontWeight: '700', color: Colors.inkSoft },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: Colors.inkFaint },
  normalNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14 },
  normalNoteUp: { backgroundColor: Colors.accentTint },
  normalNoteDown: { backgroundColor: Colors.dangerBg },
  normalNoteText: { fontSize: 14, fontWeight: '600', color: Colors.ink, lineHeight: 20 },
  normalNoteExtra: { fontSize: 13, color: Colors.inkMuted, lineHeight: 19 },

  keepInMindBody: { fontSize: 14, color: Colors.inkMuted, lineHeight: 20, marginBottom: 14 },
  favorRow: { flexDirection: 'row', gap: 6 },
  favorItem: { flex: 1, alignItems: 'center' },
  favorIconWrap: { width: '100%', height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  favorIconWrapYes: { backgroundColor: Colors.accentTint },
  favorIconWrapNo: { backgroundColor: Colors.dangerBg },
  favorLabel: { fontSize: 11, color: Colors.inkFaint, marginTop: 5 },

  disclosureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  disclosureText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.ink },

});

/** Hero-top styles shared by screens that render into `heroTop`. */
export const heroTopStyles = StyleSheet.create({
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, ...cardShadow },
  pillError: { backgroundColor: Colors.dangerBg },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.ink },
});
