import { cardShadow, Colors, ForecastColors } from '@/src/constants/colors';
import { treeCopy as copy } from '@/src/constants/copy';
import type { DecisionTree as Tree, OutcomeKey, TreeBranch, TreeOutcome } from '@/src/rcda/decisionTree';
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

const OUTCOME_COLORS: Record<OutcomeKey, string> = {
  dry: ForecastColors.dry,
  average: ForecastColors.average,
  wet: ForecastColors.wet,
};

const RAIL = Colors.borderStrong;

export function formatPeso(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : ''}₱${Math.abs(rounded).toLocaleString()}`;
}

function formatPct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

function Rail({ isLast, nodeCenter }: { isLast: boolean; nodeCenter: number }) {
  return (
    <>
      <View style={[s.railV, isLast ? { height: nodeCenter + 1 } : { bottom: 0 }]} />
      <View style={[s.railH, { top: nodeCenter }]} />
    </>
  );
}

function useCenter(fallback: number, offset = 0) {
  const [center, setCenter] = useState(fallback);
  const onLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    const next = Math.round(offset + y + height / 2);
    if (next !== center) setCenter(next);
  };
  return [center, onLayout] as const;
}

function Outcome({ outcome: o, isLast }: { outcome: TreeOutcome; isLast: boolean }) {
  const [center, onTopLayout] = useCenter(OUTCOME_FALLBACK_CENTER, OUTCOME_PAD_TOP);
  const notForecast = o.value === null;
  return (
    <View style={[s.outcome, notForecast && s.notForecast]}>
      <Rail isLast={isLast} nodeCenter={center} />
      <View style={[s.leafSlot, { height: (center - OUTCOME_PAD_TOP) * 2 }]}>
        <View style={[s.leafNode, { backgroundColor: OUTCOME_COLORS[o.key] }]} />
      </View>
      <View style={s.outcomeBody}>
        <View style={s.outcomeTop} onLayout={onTopLayout}>
          <Text style={s.outcomeLabel}>{copy.outcomes[o.key]}</Text>
          <Text style={s.outcomePct}>{formatPct(o.probability)}</Text>
          <Text style={[s.outcomeValue, notForecast ? s.outcomeValueNone : o.value! >= 0 ? s.positive : s.negative]}>
            {notForecast ? copy.notForecast : formatPeso(o.value!)}
          </Text>
        </View>
        <View style={s.probTrack}>
          <View style={[s.probFill, { width: `${Math.round(o.probability * 100)}%`, backgroundColor: OUTCOME_COLORS[o.key] }]} />
        </View>
      </View>
    </View>
  );
}

function Branch({ branch, isLast, dimmed }: { branch: TreeBranch; isLast: boolean; dimmed: boolean }) {
  const [center, onHeaderLayout] = useCenter(BRANCH_FALLBACK_CENTER);
  const tone = branch.recommended ? Colors.accent : Colors.inkSoft;
  const terms = branch.outcomes.filter((o) => o.value !== null);

  return (
    <View
      style={s.branch}
      accessible
      accessibilityLabel={`${branch.optionName}${branch.recommended ? ', recommended' : ''}. ${copy.expected} ${formatPeso(branch.expectedValue)}. `
        + branch.outcomes
          .map((o) => `${copy.outcomes[o.key]} ${formatPct(o.probability)}${o.value === null ? '' : `, ${formatPeso(o.value)}`}`)
          .join('. ')}
    >
      <Rail isLast={isLast} nodeCenter={center} />

      <View style={[s.branchHeader, branch.recommended && s.branchHeaderBest]} onLayout={onHeaderLayout}>
        <View style={[s.chanceNode, { borderColor: tone }]} />
        <View style={s.branchTitleWrap}>
          <View style={s.branchTitleRow}>
            <Text style={[s.branchName, branch.recommended && s.branchNameBest]} numberOfLines={1}>
              {branch.optionName}
            </Text>
            {branch.recommended && (
              <View style={s.bestBadge}>
                <Text style={s.bestBadgeText}>{copy.best}</Text>
              </View>
            )}
          </View>
          <Text style={s.expected}>
            {copy.expected} <Text style={[s.expectedValue, { color: tone }]}>{formatPeso(branch.expectedValue)}</Text>
          </Text>
        </View>
      </View>

      <View style={dimmed && s.dimmed}>
        <View style={s.outcomes}>
          {branch.outcomes.map((o, i) => (
            <Outcome key={o.key} outcome={o} isLast={i === branch.outcomes.length - 1} />
          ))}
        </View>

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
    </View>
  );
}

export function DecisionTree({ tree, bare = false }: { tree: Tree; bare?: boolean }) {
  const hasBest = tree.branches.some((b) => b.recommended);
  return (
    <View style={bare ? s.bare : s.card}>
      <Text style={s.heading}>{copy.heading}</Text>
      <Text style={s.subtitle}>{copy.subtitle}</Text>

      <View style={s.rootRow}>
        <View style={s.rootNode} />
        <Text style={s.rootLabel}>{copy.rootLabel}</Text>
      </View>

      <View style={s.branches}>
        {tree.branches.map((b, i) => (
          <Branch
            key={b.optionIndex}
            branch={b}
            isLast={i === tree.branches.length - 1}
            dimmed={hasBest && !b.recommended}
          />
        ))}
      </View>
    </View>
  );
}

const BRANCH_FALLBACK_CENTER = 37;
const OUTCOME_PAD_TOP = 8;
const OUTCOME_FALLBACK_CENTER = OUTCOME_PAD_TOP + 9;
const ROOT_SIZE = 18;
const INDENT = 22;

const s = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, marginBottom: 14, ...cardShadow },
  bare: { paddingVertical: 4, marginBottom: 18 },
  heading: { fontSize: 14, fontWeight: '800', color: Colors.ink },
  subtitle: { fontSize: 13, color: Colors.inkSoft, lineHeight: 18, marginTop: 4, marginBottom: 16 },

  rootRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rootNode: { width: ROOT_SIZE, height: ROOT_SIZE, borderRadius: 4, backgroundColor: Colors.ink },
  rootLabel: { fontSize: 13, fontWeight: '700', color: Colors.ink },

  // Rails hang from the parent node's centre line.
  branches: { marginLeft: ROOT_SIZE / 2 - 1 },
  railV: { position: 'absolute', left: 0, top: 0, width: 2, backgroundColor: RAIL },
  railH: { position: 'absolute', left: 0, width: INDENT - 6, height: 2, backgroundColor: RAIL },

  branch: { paddingLeft: INDENT, paddingTop: 10 },
  branchHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  branchHeaderBest: { backgroundColor: Colors.accentTint },
  chanceNode: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, backgroundColor: Colors.surface },
  branchTitleWrap: { flex: 1 },
  branchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  branchName: { fontSize: 15, fontWeight: '700', color: Colors.inkSoft, flexShrink: 1 },
  branchNameBest: { color: Colors.ink, fontWeight: '800' },
  bestBadge: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.onDark, letterSpacing: 0.6 },
  expected: { fontSize: 12, color: Colors.inkFaint, marginTop: 2 },
  expectedValue: { fontSize: 13, fontWeight: '800' },

  dimmed: { opacity: 0.6 },

  // Outcome rails hang from the chance node (header padding + half the node).
  outcomes: { marginLeft: 10 + 8 - 1, marginTop: 2 },
  outcome: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: INDENT, paddingTop: OUTCOME_PAD_TOP },
  notForecast: { opacity: 0.5 },
  leafSlot: { justifyContent: 'center' },
  leafNode: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  outcomeBody: { flex: 1 },
  outcomeTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  outcomeLabel: { fontSize: 13, fontWeight: '600', color: Colors.ink, flex: 1 },
  outcomePct: { fontSize: 12, fontWeight: '700', color: Colors.inkSoft, minWidth: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  outcomeValue: { fontSize: 13, fontWeight: '800', minWidth: 92, textAlign: 'right', fontVariant: ['tabular-nums'] },
  outcomeValueNone: { color: Colors.placeholder, fontWeight: '600', fontSize: 12 },
  positive: { color: Colors.accent },
  negative: { color: Colors.danger },
  probTrack: { height: 3, borderRadius: 2, backgroundColor: Colors.divider, marginTop: 5, overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: 2, opacity: 0.7 },

  formula: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, rowGap: 2, marginTop: 10, marginLeft: 10 },
  formulaTerm: { fontSize: 12, color: Colors.inkFaint, fontVariant: ['tabular-nums'] },
  formulaOp: { fontSize: 12, color: Colors.placeholder },
  formulaTotal: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
