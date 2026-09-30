import { computeRcda, RcdaInputs } from '../../src/rcda/decisionTree';
import { summarizeRcda } from '../../src/rcda/summary';

// Same worked example as tests/rcda-test.test.ts: cabbage vs. atsal.
const EXAMPLE: RcdaInputs = {
  optionNames: ['cabbage', 'atsal'],
  yield: [[0, 3000, 8000, 12000, 10000], [0, 8000, 10000, 5000, 0]],
  cost: [[20000, 100000, 150000, 150000, 170000], [30000, 100000, 100000, 120000, 30000]],
  addCost: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
  price: [70, 40],
  climate: [90, 5, 5],
};

describe('summarizeRcda', () => {
  const computation = computeRcda(EXAMPLE);
  const summary = summarizeRcda(computation, EXAMPLE.optionNames, EXAMPLE.climate);

  it('rounds the scores and rounds the exact score gap once, matching Excel L36 (7041.64 to 7042)', () => {
    expect(summary.scores).toEqual([105221, 112262]);
    expect(summary.profitIncrease).toBe(7042);
    expect(summary.recommendedOption).toBe(1);
  });

  it('samples the walk at percentiles 10/30/50/70/90 for the breakdown table', () => {
    expect(summary.breakdown).toHaveLength(2);
    [9, 29, 49, 69, 89].forEach((pi, ci) => {
      expect(summary.breakdown[0][ci]).toBe(Math.round(computation.profitWalk[pi][0]));
      expect(summary.breakdown[1][ci]).toBe(Math.round(computation.profitWalk[pi][1]));
    });
  });

  it('compares the options on the decision-tree thirds, skipping ones the forecast gives 0%', () => {
    const [cabbage, atsal] = summary.tree.branches.map((b) => b.outcomes);
    expect(summary.outcomeFavors).toEqual(
      atsal.map((o, t) => ({ key: o.key, favorsWinner: o.value! >= cabbage[t].value! }))
    );
    const noWet = summarizeRcda(computeRcda({ ...EXAMPLE, climate: [90, 10, 0] }), EXAMPLE.optionNames, [90, 10, 0]);
    expect(noWet.outcomeFavors.map((o) => o.key)).toEqual(['dry', 'average']);
  });

  it('is not bothNegative when at least one option has a positive score', () => {
    expect(summary.bothNegative).toBe(false);
  });

  it('carries a tree that agrees with the recommendation', () => {
    expect(summary.tree.recommendedOption).toBe(summary.recommendedOption);
    expect(summary.tree.branches.map((b) => Math.round(b.expectedValue))).toEqual(summary.scores);
  });
});

// Excel L35/L36: IF(avg<=0,"neg", ...). Only a positive average can be "MAX" and earn a gain.
describe('summarizeRcda with losing options', () => {
  const run = (price: number[]) => {
    const inputs = { ...EXAMPLE, price };
    return summarizeRcda(computeRcda(inputs), inputs.optionNames, inputs.climate);
  };

  it('still subtracts when one option is negative and the other positive (MAX minus neg)', () => {
    const summary = run([1, 40]);
    expect(summary.scores[0]).toBeLessThanOrEqual(0);
    expect(summary.scores[1]).toBeGreaterThan(0);
    expect(summary.bothNegative).toBe(false);
    expect(summary.recommendedOption).toBe(1);
    expect(summary.profitIncrease).toBe(Math.round(summary.tree.branches[1].expectedValue - summary.tree.branches[0].expectedValue));
  });

  it('recommends nothing and reports no gain when both options lose money', () => {
    const summary = run([1, 1]);
    expect(summary.scores.every((s) => s <= 0)).toBe(true);
    expect(summary.bothNegative).toBe(true);
    expect(summary.profitIncrease).toBe(0);
    expect(summary.tree.branches.some((b) => b.recommended)).toBe(false);
  });
});
