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

  it('flags the scenarios where the recommended option earns at least as much', () => {
    const [cabbage, atsal] = summary.breakdown;
    expect(summary.favorFlags).toEqual(atsal.map((v, i) => v >= cabbage[i]));
  });

  it('carries a tree that agrees with the recommendation', () => {
    expect(summary.tree.recommendedOption).toBe(summary.recommendedOption);
    expect(summary.tree.branches.map((b) => Math.round(b.expectedValue))).toEqual(summary.scores);
  });
});
