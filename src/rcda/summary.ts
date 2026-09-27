import { buildDecisionTree, DecisionTree, RcdaComputation } from './decisionTree';

export const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'] as const;

// Walk indices (0-based) sampled to represent the 5 scenarios across the 100 percentiles.
const SAMPLE_INDICES = [9, 29, 49, 69, 89];

/** Everything the result view displays, derived from one RCDA computation. */
export interface RcdaSummary {
  optionNames: string[];
  recommendedOption: 0 | 1;
  scores: number[];           // rounded RCDA score per option
  profitIncrease: number;     // exact score gap rounded once (Excel L36), saved as profit_increase
  breakdown: number[][];      // [option][scenario] rounded net return at the sampled percentiles
  favorFlags: boolean[];      // per scenario: does the recommended option earn at least as much?
  tree: DecisionTree;
}

export function summarizeRcda(
  computation: RcdaComputation,
  optionNames: string[],
  climate: number[]
): RcdaSummary {
  const { profitWalk, averages, recommendedOption } = computation;
  const scores = [Math.round(averages[0]), Math.round(averages[1])];
  const breakdown = [0, 1].map((oi) =>
    SAMPLE_INDICES.map((pi) => Math.round(profitWalk[pi]?.[oi] ?? 0))
  );
  const winner = breakdown[recommendedOption];
  const loser = breakdown[1 - recommendedOption];

  return {
    optionNames,
    recommendedOption,
    scores,
    profitIncrease: Math.round(Math.abs(averages[0] - averages[1])),
    breakdown,
    favorFlags: winner.map((v, i) => v >= loser[i]),
    tree: buildDecisionTree(computation, climate, optionNames),
  };
}
