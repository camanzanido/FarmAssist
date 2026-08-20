/**
 * Unit tests for the RCDA calculation engine (src/rcda).
 *
 * The primary fixture below is the worked example from the original RCDA
 * Excel workbook: two crops (cabbage vs. atsal), 5 collected climate
 * scenarios (Driest, Below Average, Average, Above Average, Wettest), and
 * a climate forecast of Driest 90% / Mid 5% / Wettest 5%.
 *
 * See the bottom of this file ("end-to-end pipeline") for an important
 * caveat: the full pipeline currently does NOT reproduce the Excel
 * workbook's expected result for this fixture.
 */

import {
  expandClimateScenarios,
  expandScenario5to7,
  getDifference,
  getDifferenceGraph,
  getcltlgyRevised,
  getIncome,
  getProfit,
  getProfitByDecile,
  getRegretPlease,
  getYield,
  xAxisRevisedClimatology,
} from '../src/rcda/financials';
import { cltlgy } from '../src/rcda/constants';
import { lookUp, percentRank } from '../src/rcda/interpolations';
import {
  getCrossOver,
  incrementProfit,
  tercileToPointDistribution,
  terciles,
} from '../src/rcda/model';

// ---------------------------------------------------------------------------
// Fixture: worked example from the RCDA Excel workbook
// ---------------------------------------------------------------------------
// Rows are climate scenarios [Driest, Below Average, Average, Above Average,
// Wettest]; columns are [cabbage, atsal].
const EXAMPLE_YIELD = [
  [0.0, 0.0],
  [3000.0, 8000.0],
  [8000.0, 10000.0],
  [12000.0, 5000.0],
  [10000.0, 0.0],
];
const EXAMPLE_COST = [
  [20000.0, 30000.0],
  [100000.0, 100000.0],
  [150000.0, 100000.0],
  [150000.0, 120000.0],
  [170000.0, 30000.0],
];
const EXAMPLE_ADD_COST = [
  [0.0, 0.0],
  [0.0, 0.0],
  [0.0, 0.0],
  [0.0, 0.0],
  [0.0, 0.0],
];
const EXAMPLE_PRICE: [number, number] = [70, 40]; // [cabbage, atsal]
const EXAMPLE_CLIMATE = [90, 5, 5]; // [Driest %, Mid %, Wettest %]

// 5 scenarios expanded to the model's 7-point climatology
// (Driest, Very Dry, Below Avg, Average, Above Avg, Very Good, Wettest).
const EXAMPLE_YIELD_7 = expandClimateScenarios(EXAMPLE_YIELD);
const EXAMPLE_COST_7 = expandClimateScenarios(EXAMPLE_COST);
const EXAMPLE_ADD_COST_7 = expandClimateScenarios(EXAMPLE_ADD_COST);

describe('financials: expandClimateScenarios / expandScenario5to7', () => {
  it('duplicates the driest row into "very dry" and the wettest row into "very good"', () => {
    expect(EXAMPLE_YIELD_7).toEqual([
      [0.0, 0.0],
      [0.0, 0.0],
      [3000.0, 8000.0],
      [8000.0, 10000.0],
      [12000.0, 5000.0],
      [10000.0, 0.0],
      [10000.0, 0.0],
    ]);
  });

  it('returns [] when not given exactly 5 rows', () => {
    expect(expandClimateScenarios([[1, 2]])).toEqual([]);
    expect(expandClimateScenarios([...EXAMPLE_YIELD, [1, 1]])).toEqual([]);
  });

  it('expands a single option flat 5-value array to 7 values', () => {
    expect(expandScenario5to7([0, 3000, 8000, 12000, 10000])).toEqual([
      0, 0, 3000, 8000, 12000, 10000, 10000,
    ]);
  });
});

describe('financials: getYield', () => {
  it('interpolates Very Dry from Driest/Below-Average and Very Good from Above-Average/Wettest', () => {
    const result = getYield(EXAMPLE_YIELD_7);
    expect(result[0]).toEqual([0, 0]); // Driest: unchanged
    expect(result[1][0]).toBeCloseTo(900, 6); // Very Dry cabbage: 0 + (3000-0)/30*9
    expect(result[1][1]).toBeCloseTo(2400, 6); // Very Dry atsal: 0 + (8000-0)/30*9
    expect(result[2]).toEqual([3000, 8000]); // Below Average: unchanged
    expect(result[3]).toEqual([8000, 10000]); // Average: unchanged
    expect(result[4]).toEqual([12000, 5000]); // Above Average: unchanged
    expect(result[5][0]).toBeCloseTo(10666.666666666666, 6); // Very Good cabbage
    expect(result[5][1]).toBeCloseTo(1666.6666666666667, 6); // Very Good atsal
    expect(result[6]).toEqual([10000, 0]); // Wettest: unchanged
  });

  it('returns [] unless given exactly 7 rows', () => {
    expect(getYield(EXAMPLE_YIELD)).toEqual([]);
  });
});

describe('financials: getIncome', () => {
  it('multiplies each yield row by the two crop prices', () => {
    const yield7 = getYield(EXAMPLE_YIELD_7);
    const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
    expect(income[0]).toEqual([0, 0]);
    expect(income[2]).toEqual([210000, 320000]); // 3000*70, 8000*40
    expect(income[3]).toEqual([560000, 400000]); // 8000*70, 10000*40
    expect(income[4]).toEqual([840000, 200000]); // 12000*70, 5000*40
    expect(income[6]).toEqual([700000, 0]); // 10000*70, 0*40
  });

  it('returns [] unless given exactly 7 rows', () => {
    expect(getIncome(EXAMPLE_YIELD, 70, 40)).toEqual([]);
  });
});

describe('financials: getProfit', () => {
  it('subtracts cost and additional cost from income, floored at -cost', () => {
    const yield7 = getYield(EXAMPLE_YIELD_7);
    const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
    const profit = getProfit(income, EXAMPLE_COST_7, EXAMPLE_ADD_COST_7);

    expect(profit[0]).toEqual([-20000, -30000]); // no income yet, loss = -cost (floor)
    expect(profit[1]).toEqual([43000, 66000]);
    expect(profit[2]).toEqual([110000, 220000]);
    expect(profit[3]).toEqual([410000, 300000]);
    expect(profit[4]).toEqual([690000, 80000]);
    expect(profit[5][0]).toBeCloseTo(576666.6666666666, 4);
    expect(profit[5][1]).toBeCloseTo(36666.66666666669, 4);
    expect(profit[6]).toEqual([530000, -30000]);
  });

  it('never drops profit below -cost, even for a heavy loss', () => {
    const profit = getProfit([[0, 0]], [[5000, 5000]], [[10000, 10000]]);
    expect(profit).toEqual([[-5000, -5000]]);
  });

  it('returns [] when row counts of income/cost/addCost disagree', () => {
    expect(getProfit([[1, 1]], [[1, 1], [1, 1]], [[1, 1]])).toEqual([]);
  });
});

describe('financials: getDifference / getRegretPlease', () => {
  const yield7 = getYield(EXAMPLE_YIELD_7);
  const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
  const profit = getProfit(income, EXAMPLE_COST_7, EXAMPLE_ADD_COST_7);

  it('computes crop2 - crop1 profit per scenario', () => {
    const diff = getDifference(profit);
    expect(diff[0]).toBeCloseTo(-10000, 4);
    expect(diff[1]).toBeCloseTo(23000, 4);
    expect(diff[2]).toBeCloseTo(110000, 4);
    expect(diff[3]).toBeCloseTo(-110000, 4);
    expect(diff[4]).toBeCloseTo(-610000, 4);
    expect(diff[6]).toBeCloseTo(-560000, 4);
  });

  it('getRegretPlease is the signed mirror of getDifference', () => {
    const diff = getDifference(profit);
    const regretAsFirst = getRegretPlease(profit, true);
    const regretAsSecond = getRegretPlease(profit, false);
    diff.forEach((d, i) => {
      expect(regretAsFirst[i]).toBeCloseTo(-d, 4);
      expect(regretAsSecond[i]).toBeCloseTo(d, 4);
    });
  });
});

describe('financials: getcltlgyRevised', () => {
  it('spreads a 3-value climate forecast into 7 cumulative percentile points', () => {
    expect(getcltlgyRevised(EXAMPLE_CLIMATE)).toEqual([
      1,
      90 / 3.3,
      90,
      92.5,
      95,
      100 - 5 / 3.3,
      100,
    ]);
  });

  it('returns [] for a null climate input', () => {
    expect(getcltlgyRevised(null)).toEqual([]);
  });
});

describe('financials: getProfitByDecile', () => {
  it('zips the fixed and revised climatology with both crops\' profit', () => {
    const yield7 = getYield(EXAMPLE_YIELD_7);
    const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
    const profit = getProfit(income, EXAMPLE_COST_7, EXAMPLE_ADD_COST_7);
    const revised = getcltlgyRevised(EXAMPLE_CLIMATE);

    const byDecile = getProfitByDecile(revised, profit);
    expect(byDecile[0]).toEqual([cltlgy[0], revised[0], profit[0][0], profit[0][1]]);
    expect(byDecile[2]).toEqual([cltlgy[2], revised[2], profit[2][0], profit[2][1]]);
    expect(byDecile[6]).toEqual([cltlgy[6], revised[6], profit[6][0], profit[6][1]]);
  });
});

describe('financials: xAxisRevisedClimatology / getDifferenceGraph', () => {
  it('converts a 3-value climate split into 9 chart x-axis points', () => {
    expect(xAxisRevisedClimatology(EXAMPLE_CLIMATE)).toEqual([
      44, 2, 44, 1.5, 2, 1.5, 1.5, 2, 1.5,
    ]);
  });

  it('returns [] unless given exactly 3 values', () => {
    expect(xAxisRevisedClimatology([1, 2])).toEqual([]);
  });

  it('pairs the fixed climatology with a difference series for charting', () => {
    const climate = [1, 2, 3, 4, 5, 6, 7];
    const difference = [10, 20, 30, 40, 50, 60, 70];
    expect(getDifferenceGraph(climate, difference)).toEqual([
      [cltlgy[0], 10, 1, 10],
      [cltlgy[1], 20, 2, 20],
      [cltlgy[2], 30, 3, 30],
      [cltlgy[3], 40, 4, 40],
      [cltlgy[4], 50, 5, 50],
      [cltlgy[5], 60, 6, 60],
      [cltlgy[6], 70, 7, 70],
    ]);
  });
});

describe('interpolations: lookUp', () => {
  it('returns the index of an exact match', () => {
    expect(lookUp(5, [1, 3, 5, 7])).toBe(2);
  });

  it('returns the index just before the first larger element', () => {
    expect(lookUp(4, [1, 3, 5, 7])).toBe(1);
  });

  it('returns 0 for any value below 1', () => {
    expect(lookUp(0, [1, 2, 3])).toBe(0);
    expect(lookUp(-5, [1, 2, 3])).toBe(0);
  });
});

describe('interpolations: percentRank', () => {
  it('matches Excel-style PERCENTRANK for a value present in the array', () => {
    expect(percentRank([1, 2, 3, 4, 5], 3)).toBeCloseTo(0.5, 6);
  });

  it('interpolates rank for a value between two array entries', () => {
    expect(percentRank([10, 20, 30], 25)).toBeCloseTo(0.75, 6);
  });

  it('returns 0 for an empty array or a value at/below the minimum', () => {
    expect(percentRank([], 5)).toBe(0);
    expect(percentRank([5, 6, 7], 5)).toBe(0);
  });

  it('returns 1 for a value at/above the maximum', () => {
    expect(percentRank([5, 6, 7], 7)).toBe(1);
  });
});

describe('model: terciles / tercileToPointDistribution', () => {
  it('produces three 52-point series that always sum to 100', () => {
    const [t1, t2, t3] = terciles();
    expect(t1).toHaveLength(52);
    expect(t2).toHaveLength(52);
    expect(t3).toHaveLength(52);
    for (let i = 0; i < 52; i++) {
      expect(t1[i] + t2[i] + t3[i]).toBeCloseTo(100, 6);
    }
  });

  it('starts at the documented climatology split (33/34/33, then widening)', () => {
    const [t1, t2, t3] = terciles();
    expect([t1[0], t1[1], t1[2], t1[3]]).toEqual([33, 33, 90, 90]);
    expect([t2[0], t2[1]]).toEqual([34, 34]);
    expect([t3[0], t3[1]]).toEqual([33, 33]);
  });

  it('tercileToPointDistribution returns one row per fixed climatology point (7), 52 columns each', () => {
    const dist = tercileToPointDistribution();
    expect(dist).toHaveLength(cltlgy.length);
    dist.forEach(row => expect(row).toHaveLength(52));
    // Row 0 is defined as "always 1" (the driest anchor point).
    expect(dist[0].every(v => v === 1)).toBe(true);
    // Last row is defined as "always 100" (the wettest anchor point).
    expect(dist[dist.length - 1].every(v => v === 100)).toBe(true);
  });
});

describe('model: end-to-end pipeline (incrementProfit + getCrossOver)', () => {
  // This mirrors the wiring in app/(decision)/result.tsx's computeResult():
  // transpose the crop-major input into scenario-major rows, expand 5->7
  // scenarios, then run yield -> income -> profit -> incrementProfit -> getCrossOver.
  const crops = [['cabbage'], ['atsal']];

  const yield7 = getYield(EXAMPLE_YIELD_7);
  const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
  const profit = getProfit(income, EXAMPLE_COST_7, EXAMPLE_ADD_COST_7);
  const tercilePoints = tercileToPointDistribution();

  const interpolationData = incrementProfit(
    tercilePoints,
    yield7,
    EXAMPLE_PRICE[0],
    EXAMPLE_PRICE[1],
    EXAMPLE_COST_7,
    EXAMPLE_ADD_COST_7,
    profit,
    crops
  );
  const crossOver = getCrossOver(crops, interpolationData);

  it('recommends atsal for this fixture, matching the Excel workbook\'s pick', () => {
    // Excel expects: cabbage 105,221 (94%) vs atsal 112,262 (MAX).
    // The current TS pipeline agrees on WHICH crop wins...
    expect(crossOver[2][0]).toBe('atsal');
    expect(crossOver[1][1]).toBeLessThan(crossOver[2][1]);
  });

  it('[KNOWN DISCREPANCY] does not currently reproduce the Excel workbook\'s magnitudes', () => {
    // ...but NOT on the size of the expected return. The Excel workbook
    // expects roughly cabbage=105,221 / atsal=112,262 (diff ~P7,041.64).
    // The current pipeline instead produces:
    const cabbageAvg = crossOver[1][1] as number;
    const atsalAvg = crossOver[2][1] as number;
    expect(cabbageAvg).toBeCloseTo(27.27, 1);
    expect(atsalAvg).toBeCloseTo(1068.12, 1);

    // Root cause: incrementProfit()/tercileToPointDistribution() never
    // receive the user's climate forecast (Driest/Mid/Wettest %). They only
    // use the fixed default split baked into terciles() (33/34/33), so
    // EXAMPLE_CLIMATE = [90, 5, 5] has zero effect on this result. The
    // climate-aware path (getcltlgyRevised -> interpolation7Points in
    // src/rcda/interpolations.ts) exists but is never called from
    // app/(decision)/result.tsx. This test exists to document today's
    // actual behavior and should be revisited once that wiring is fixed.
  });
});
