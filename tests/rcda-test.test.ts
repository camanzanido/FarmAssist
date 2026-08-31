
import { cltlgy } from '../src/rcda/constants';
import {
  expandClimateScenarios,
  expandScenario5to7,
  getDifference,
  getDifferenceGraph,
  getIncome,
  getProfit,
  getProfitByDecile,
  getRegretPlease,
  getYield,
  getcltlgyRevised,
  xAxisRevisedClimatology,
} from '../src/rcda/financials';
import {
  getCrossOverAverages,
  getRevisedProfitWalk,
  lookUp,
  percentRank,
} from '../src/rcda/interpolations';

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

const EXAMPLE_YIELD_7 = expandClimateScenarios(EXAMPLE_YIELD);
const EXAMPLE_COST_7 = expandClimateScenarios(EXAMPLE_COST);
const EXAMPLE_ADD_COST_7 = expandClimateScenarios(EXAMPLE_ADD_COST);
console.log("Cost: ", EXAMPLE_COST_7);
console.log("Add Cost: ", EXAMPLE_ADD_COST_7);

describe('financials: expandClimateScenarios / expandScenario5to7', () => {
  it('duplicates the driest row into "very dry" and the wettest row into "very good"', () => {
    console.log("Expanded Yield", EXAMPLE_YIELD_7);
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
    console.log("Yield:", result);
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
    console.log("Income: ",  income);
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

    console.log("profit: ", profit);

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

describe('interpolations: getRevisedProfitWalk / getCrossOverAverages', () => {
  const yield7 = getYield(EXAMPLE_YIELD_7);
  const income = getIncome(yield7, EXAMPLE_PRICE[0], EXAMPLE_PRICE[1]);
  const profit = getProfit(income, EXAMPLE_COST_7, EXAMPLE_ADD_COST_7);

  it('starts the walk at the Driest scenario\'s profit (Excel F91/G91 = L6/M6)', () => {
    const walk = getRevisedProfitWalk(profit, EXAMPLE_CLIMATE);
    expect(walk[0]).toEqual([-20000, -30000]);
  });

  it('matches Excel F92/G92 for percentile 2 (LOOKUP into the first revised segment)', () => {
    const walk = getRevisedProfitWalk(profit, EXAMPLE_CLIMATE);
    expect(walk[1][0]).toBeCloseTo(-17602.076124567473, 4);
    expect(walk[1][1]).toBeCloseTo(-26346.020761245676, 4);
  });

  it('returns [] unless given exactly 7 profit rows and a valid climate forecast', () => {
    expect(getRevisedProfitWalk([[1, 1]], EXAMPLE_CLIMATE)).toEqual([]);
    expect(getRevisedProfitWalk(profit, null as unknown as number[])).toEqual([]);
  });

  it('reproduces the Excel workbook\'s exact crossover averages (F193/G193)', () => {
    const walk = getRevisedProfitWalk(profit, EXAMPLE_CLIMATE);
    const [cabbageAvg, atsalAvg] = getCrossOverAverages(walk);
    expect(cabbageAvg).toBeCloseTo(105220.57033248087, 4);
    expect(atsalAvg).toBeCloseTo(112262.21483375966, 4);
    // Excel's K35 (93.7% -> "94%") and L36 (P7,041.64) fall out of these:
    expect(cabbageAvg / atsalAvg).toBeCloseTo(0.93727502604766699, 6);
    expect(atsalAvg - cabbageAvg).toBeCloseTo(7041.6445012787881, 4);
  });
});

