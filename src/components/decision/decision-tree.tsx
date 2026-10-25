import { CARD_PADDING, cardShadow, cardSurface, Colors, ForecastColors } from '@/src/constants/colors';
import { treeCopy as copy } from '@/src/constants/copy';
import type { DecisionTree as Tree, OutcomeKey, TreeBranch, TreeOutcome } from '@/src/rcda/decisionTree';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const OUTCOME_COLORS: Record<OutcomeKey, string> = {
  dry: ForecastColors.dry,
  average: ForecastColors.average,
  wet: ForecastColors.wet,
};

const RAIL = Colors.borderStrong;
const RAIL_BEST = Colors.accent;
const LINE = 2;
const STEM = 14;

export function formatPeso(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : ''}₱${Math.abs(rounded).toLocaleString()}`;
}

function formatPct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

function Stem({ color, height = STEM, grow = false }: { color: string; height?: number; grow?: boolean }) {
  return <View style={[s.stem, { backgroundColor: color, minHeight: height }, grow && { flexGrow: 1 }]} />;
}

// The horizontal half of an elbow joining a column centre to the middle of the tree.
function HalfBar({ side, color, edge }: { side: 'left' | 'right'; color: string; edge: 'top' | 'bottom' }) {
  return (
    <View
      style={[
        s.halfBar,
        { backgroundColor: color, [edge]: 0 },
        side === 'left' ? { left: '25%', right: '50%' } : { left: '50%', right: '25%' },
      ]}
    />
  );
}

function OutcomeCard({ outcome: o }: { outcome: TreeOutcome }) {
  const notForecast = o.value === null;
  return (
    <View style={[s.outcome, notForecast && s.notForecast]}>
      <View style={s.outcomeTop}>
        <Text style={s.outcomeLabel} numberOfLines={1}>{copy.outcomes[o.key]}</Text>
        <Text style={s.outcomePct}>{formatPct(o.probability)}</Text>
      </View>
      <Text style={[s.outcomeValue, notForecast ? s.outcomeValueNone : o.value! >= 0 ? s.positive : s.negative]}>
        {notForecast ? copy.notForecast : formatPeso(o.value!)}
      </Text>
      <View style={s.probTrack}>
        <View style={[s.probFill, { width: `${Math.round(o.probability * 100)}%`, backgroundColor: OUTCOME_COLORS[o.key] }]} />
      </View>
    </View>
  );
}

function BranchColumn({ branch, dimmed }: { branch: TreeBranch; dimmed: boolean }) {
  const rail = branch.recommended ? RAIL_BEST : RAIL;
  return (
    <View
      style={s.column}
      accessible
      accessibilityLabel={`${branch.optionName}${branch.recommended ? ', recommended' : ''}. ${copy.expected} ${formatPeso(branch.expectedValue)}. `
        + branch.outcomes
          .map((o) => `${copy.outcomes[o.key]} ${formatPct(o.probability)}${o.value === null ? '' : `, ${formatPeso(o.value)}`}`)
          .join('. ')}
    >
      <Stem color={rail} />
      <View style={[s.option, branch.recommended && s.optionBest]}>
        <Text style={[s.optionName, branch.recommended && s.optionNameBest]} numberOfLines={2}>{branch.optionName}</Text>
        <Text style={s.expected}>{copy.expected}</Text>
        <Text style={[s.expectedValue, { color: branch.recommended ? Colors.accent : Colors.inkSoft }]}>{formatPeso(branch.expectedValue)}</Text>
      </View>
      <View style={[s.outcomes, dimmed && s.dimmed]}>
        {branch.outcomes.map((o) => (
          <React.Fragment key={o.key}>
            <Stem color={rail} height={10} />
            <OutcomeCard outcome={o} />
          </React.Fragment>
        ))}
      </View>
      <Stem color={rail} grow />
    </View>
  );
}

function Formula({ branch }: { branch: TreeBranch }) {
  const terms = branch.outcomes.filter((o) => o.value !== null);
  const tone = branch.recommended ? Colors.accent : Colors.inkSoft;
  return (
    <View style={s.formulaRow}>
      <Text style={s.formulaName} numberOfLines={1}>{branch.optionName}</Text>
      <View style={s.formula}>
        {terms.map((o, i) => (
          <React.Fragment key={o.key}>
            {i > 0 && <Text style={s.formulaOp}>+</Text>}
            <Text style={s.formulaTerm}>{formatPct(o.probability)} × {formatPeso(o.value!)}</Text>
          </React.Fragment>
        ))}
        <Text style={s.formulaOp}>=</Text>
        <Text style={[s.formulaTotal, { color: tone }]}>{formatPeso(branch.expectedValue)}</Text>
      </View>
    </View>
  );
}

export function DecisionTree({ tree, bare = false }: { tree: Tree; bare?: boolean }) {
  const best = tree.branches.find((b) => b.recommended);
  const railFor = (i: number) => (tree.branches[i]?.recommended ? RAIL_BEST : RAIL);
  const trunk = best ? RAIL_BEST : RAIL;

  return (
    <View style={bare ? s.bare : s.card}>
      <Text style={s.heading}>{copy.heading}</Text>
      <Text style={s.subtitle}>{copy.subtitle}</Text>

      <View style={s.center}>
        <View style={s.root}>
          <Text style={s.rootLabel}>{copy.rootLabel}</Text>
        </View>
        <Stem color={trunk} />
      </View>

      <View style={s.columns}>
        <HalfBar side="left" color={railFor(0)} edge="top" />
        <HalfBar side="right" color={railFor(1)} edge="top" />
        {tree.branches.map((b) => (
          <BranchColumn key={b.optionIndex} branch={b} dimmed={!!best && !b.recommended} />
        ))}
        <HalfBar side="left" color={railFor(0)} edge="bottom" />
        <HalfBar side="right" color={railFor(1)} edge="bottom" />
      </View>

      <View style={s.center}>
        <Stem color={trunk} />
        <View style={[s.conclusion, !best && s.conclusionNone]}>
          <Text style={[s.conclusionText, !best && s.conclusionTextNone]} numberOfLines={2}>
            {best ? copy.conclusionBest(best.optionName) : copy.conclusionNone}
          </Text>
        </View>
      </View>

      <Text style={s.formulaHeading}>{copy.formulaHeading}</Text>
      {tree.branches.map((b) => <Formula key={b.optionIndex} branch={b} />)}
    </View>
  );
}

const s = StyleSheet.create({
  card: { ...cardSurface, padding: CARD_PADDING, marginBottom: 14 },
  bare: { paddingVertical: 4, marginBottom: 18 },
  heading: { fontSize: 14, fontWeight: '800', color: Colors.ink },
  subtitle: { fontSize: 13, color: Colors.inkSoft, lineHeight: 18, marginTop: 4, marginBottom: 18 },

  center: { alignItems: 'center' },
  stem: { width: LINE, alignSelf: 'center' },
  halfBar: { position: 'absolute', height: LINE },

  root: { backgroundColor: Colors.ink, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, ...cardShadow },
  rootLabel: { fontSize: 14, fontWeight: '800', color: Colors.onDark },

  // Columns have no gap so their centres sit at exactly 25% and 75%, where the elbow bars end.
  columns: { flexDirection: 'row' },
  column: { flex: 1, paddingHorizontal: 5 },

  option: {
    alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 10, paddingHorizontal: 8, ...cardShadow,
  },
  optionBest: { borderColor: Colors.accent, borderWidth: 1.5, backgroundColor: Colors.accentTint },
  optionName: { fontSize: 15, fontWeight: '700', color: Colors.inkSoft, textAlign: 'center' },
  optionNameBest: { color: Colors.ink, fontWeight: '800' },
  expected: { fontSize: 11, color: Colors.inkFaint, marginTop: 4 },
  expectedValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },

  outcomes: {},
  dimmed: { opacity: 0.6 },
  outcome: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, paddingHorizontal: 10 },
  notForecast: { opacity: 0.5 },
  outcomeTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outcomeLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.ink },
  outcomePct: { fontSize: 12, fontWeight: '700', color: Colors.inkSoft, fontVariant: ['tabular-nums'] },
  outcomeValue: { fontSize: 14, fontWeight: '800', marginTop: 3, fontVariant: ['tabular-nums'] },
  outcomeValueNone: { color: Colors.placeholder, fontWeight: '600', fontSize: 12 },
  positive: { color: Colors.accent },
  negative: { color: Colors.danger },
  probTrack: { height: 3, borderRadius: 2, backgroundColor: Colors.divider, marginTop: 5, overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: 2, opacity: 0.8 },

  conclusion: { backgroundColor: Colors.ink, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18, maxWidth: '90%' },
  conclusionNone: { backgroundColor: Colors.dangerBg },
  conclusionText: { fontSize: 14, fontWeight: '800', color: Colors.onDark, textAlign: 'center' },
  conclusionTextNone: { color: Colors.danger },

  formulaHeading: { fontSize: 13, fontWeight: '700', color: Colors.ink, marginTop: 22, marginBottom: 8 },
  formulaRow: { marginBottom: 8 },
  formulaName: { fontSize: 12, fontWeight: '700', color: Colors.inkSoft, marginBottom: 2 },
  formula: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, rowGap: 2 },
  formulaTerm: { fontSize: 12, color: Colors.inkFaint, fontVariant: ['tabular-nums'] },
  formulaOp: { fontSize: 12, color: Colors.placeholder },
  formulaTotal: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
