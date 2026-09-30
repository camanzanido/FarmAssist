import { cardShadow, Colors, ForecastColors } from '@/src/constants/colors';
import { treeCopy as copy } from '@/src/constants/copy';
import type { DecisionTree as Tree, OutcomeKey, TreeBranch } from '@/src/rcda/decisionTree';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

function Branch({ branch, isLast }: { branch: TreeBranch; isLast: boolean }) {
  const tone = branch.recommended ? Colors.accent : Colors.inkSoft;
  const formula = branch.outcomes
    .filter((o) => o.value !== null)
    .map((o) => `${formatPct(o.probability)} × ${formatPeso(o.value!)}`)
    .join('  +  ');

  return (
    <View
      style={s.branch}
      accessible
      accessibilityLabel={`${branch.optionName}${branch.recommended ? ', recommended' : ''}. ${copy.expected} ${formatPeso(branch.expectedValue)}. `
        + branch.outcomes
          .map((o) => `${copy.outcomes[o.key]} ${formatPct(o.probability)}${o.value === null ? '' : `, ${formatPeso(o.value)}`}`)
          .join('. ')}
    >
      <Rail isLast={isLast} nodeCenter={BRANCH_NODE_CENTER} />

      <View style={[s.branchHeader, branch.recommended && s.branchHeaderBest]}>
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

      <View style={s.outcomes}>
        {branch.outcomes.map((o, i) => (
          <View key={o.key} style={s.outcome}>
            <Rail isLast={i === branch.outcomes.length - 1} nodeCenter={OUTCOME_NODE_CENTER} />
            <View style={[s.leafNode, { backgroundColor: OUTCOME_COLORS[o.key] }]} />
            <View style={s.outcomeBody}>
              <View style={s.outcomeTop}>
                <Text style={s.outcomeLabel}>{copy.outcomes[o.key]}</Text>
                <Text style={s.outcomePct}>{formatPct(o.probability)}</Text>
                <Text
                  style={[
                    s.outcomeValue,
                    o.value === null ? s.outcomeValueNone : o.value >= 0 ? s.positive : s.negative,
                  ]}
                >
                  {o.value === null ? copy.notForecast : formatPeso(o.value)}
                </Text>
              </View>
              <View style={s.probTrack}>
                <View
                  style={[s.probFill, { width: `${Math.round(o.probability * 100)}%`, backgroundColor: OUTCOME_COLORS[o.key] }]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={s.formula}>
        {formula}  =  <Text style={[s.formulaTotal, { color: tone }]}>{formatPeso(branch.expectedValue)}</Text>
      </Text>
    </View>
  );
}

export function DecisionTree({ tree }: { tree: Tree }) {
  return (
    <View style={s.card}>
      <Text style={s.heading}>{copy.heading}</Text>
      <Text style={s.subtitle}>{copy.subtitle}</Text>

      <View style={s.rootRow}>
        <View style={s.rootNode} />
        <Text style={s.rootLabel}>{copy.rootLabel}</Text>
      </View>

      <View style={s.branches}>
        {tree.branches.map((b, i) => (
          <Branch key={b.optionIndex} branch={b} isLast={i === tree.branches.length - 1} />
        ))}
      </View>
    </View>
  );
}

// Vertical centre of the node each rail tick points at, relative to its row.
const BRANCH_NODE_CENTER = 37; // branch paddingTop 10 + half the ~54px header
const OUTCOME_NODE_CENTER = 17; // outcome paddingTop 8 + leaf marginTop 4 + half its 10px
const ROOT_SIZE = 18;
const INDENT = 22;

const s = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, marginBottom: 14, ...cardShadow },
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

  // Outcome rails hang from the chance node (header padding + half the node).
  outcomes: { marginLeft: 10 + 8 - 1, marginTop: 2 },
  outcome: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: INDENT, paddingTop: 8 },
  leafNode: { width: 10, height: 10, borderRadius: 2, marginTop: 4, transform: [{ rotate: '45deg' }] },
  outcomeBody: { flex: 1 },
  outcomeTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  outcomeLabel: { fontSize: 13, fontWeight: '600', color: Colors.ink, flex: 1 },
  outcomePct: { fontSize: 12, fontWeight: '700', color: Colors.inkSoft, minWidth: 36, textAlign: 'right' },
  outcomeValue: { fontSize: 13, fontWeight: '800', minWidth: 92, textAlign: 'right' },
  outcomeValueNone: { color: Colors.placeholder, fontWeight: '600', fontSize: 12 },
  positive: { color: Colors.accent },
  negative: { color: Colors.danger },
  probTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.divider, marginTop: 5, overflow: 'hidden' },
  probFill: { height: '100%', borderRadius: 2 },

  formula: { fontSize: 11, color: Colors.inkFaint, marginTop: 10, marginLeft: 10, lineHeight: 16 },
  formulaTotal: { fontWeight: '800' },
});
