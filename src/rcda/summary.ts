import { buildDecisionTree, DecisionTree, OutcomeKey, RcdaComputation } from './decisionTree';

export const CLIMATE_LABELS = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'] as const;

// Walk indices (0-based) sampled to represent the 5 scenarios across the 100 percentiles.
const SAMPLE_INDICES = [9, 29, 49, 69, 89];

// Per forecast third: does the recommended option earn at least as much there?
export interface OutcomeFavor {
  key: OutcomeKey;
  favorsWinner: boolean;
}

/** Everything the result view displays, derived from one RCDA computation. */
export interface RcdaSummary {
  optionNames: string[];
  recommendedOption: 0 | 1;
  bothNegative: boolean;      // Excel L35/L36 both "neg": no option is recommended and there is no gain
  scores: number[];           // rounded RCDA score per option
  profitIncrease: number;     // exact score gap rounded once (Excel L36), 0 when bothNegative; saved as profit_increase
  breakdown: number[][];      // [option][scenario] rounded net return at the sampled percentiles
  outcomeFavors: OutcomeFavor[]; // decision-tree thirds the forecast gives a chance, in dry/average/wet order
  tree: DecisionTree;
}

export function summarizeRcda(
  computation: RcdaComputation,
  optionNames: string[],
  climate: number[]
): RcdaSummary {
  const { profitWalk, averages, recommendedOption } = computation;
  const bothNegative = averages[0] <= 0 && averages[1] <= 0;
  const scores = [Math.round(averages[0]), Math.round(averages[1])];
  const breakdown = [0, 1].map((oi) =>
    SAMPLE_INDICES.map((pi) => Math.round(profitWalk[pi]?.[oi] ?? 0))
  );

  const tree = buildDecisionTree(computation, climate, optionNames);
  if (bothNegative) {
    tree.branches.forEach((b) => { b.recommended = false; });
  }

  const winner = tree.branches[recommendedOption].outcomes;
  const loser = tree.branches[1 - recommendedOption].outcomes;
  const outcomeFavors = winner.flatMap((o, t): OutcomeFavor[] =>
    o.value === null ? [] : [{ key: o.key, favorsWinner: o.value >= loser[t].value! }]
  );

  return {
    optionNames,
    recommendedOption,
    bothNegative,
    scores,
    profitIncrease: bothNegative ? 0 : Math.round(Math.abs(averages[0] - averages[1])),
    breakdown,
    outcomeFavors,
    tree,
  };
}
