import { fakeDb, closeFakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { createDecision, getDecision } from '../../src/database/repositories/decisions';
import { buildOptionClimateFields, Option } from '../../src/database/repositories/options';
import {
  buildDecisionTree,
  collapseScenario7to5,
  computeRcda,
  decisionToRcdaInputs,
  isForecastComputable,
  RcdaComputeError,
  RcdaInputs,
} from '../../src/rcda/decisionTree';
import { expandScenario5to7 } from '../../src/rcda/financials';

beforeAll(initFakeDb);
afterEach(resetFakeDb);
afterAll(closeFakeDb);

// Same worked example as tests/rcda-test.test.ts: cabbage vs. atsal.
const EXAMPLE: RcdaInputs = {
  optionNames: ['cabbage', 'atsal'],
  yield: [
    [0, 3000, 8000, 12000, 10000],
    [0, 8000, 10000, 5000, 0],
  ],
  cost: [
    [20000, 100000, 150000, 150000, 170000],
    [30000, 100000, 100000, 120000, 30000],
  ],
  addCost: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  price: [70, 40],
  climate: [90, 5, 5],
};

// Deterministic pseudo-random inputs so the property check is reproducible.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function randomInputs(rng: () => number): RcdaInputs {
  const row = (max: number) => Array.from({ length: 5 }, () => Math.round(rng() * max));
  const driest = 1 + Math.floor(rng() * 60);
  const wettest = 1 + Math.floor(rng() * (98 - driest));
  return {
    optionNames: ['A', 'B'],
    yield: [row(15000), row(15000)],
    cost: [row(200000), row(200000)],
    addCost: [row(20000), row(20000)],
    price: [10 + Math.round(rng() * 90), 10 + Math.round(rng() * 90)],
    climate: [driest, 100 - driest - wettest, wettest],
  };
}

describe('computeRcda', () => {
  it('reproduces the Excel workbook crossover averages (F193/G193)', () => {
    const r = computeRcda(EXAMPLE);
    expect(r.profitWalk).toHaveLength(100);
    expect(r.averages[0]).toBeCloseTo(105220.57033248087, 4);
    expect(r.averages[1]).toBeCloseTo(112262.21483375966, 4);
    expect(r.recommendedOption).toBe(1);
  });
});

describe('buildDecisionTree', () => {
  it('uses the forecast as branch probabilities', () => {
    const tree = buildDecisionTree(computeRcda(EXAMPLE), EXAMPLE.climate, EXAMPLE.optionNames);
    for (const branch of tree.branches) {
      expect(branch.outcomes.map((o) => o.key)).toEqual(['dry', 'average', 'wet']);
      expect(branch.outcomes.map((o) => o.probability)).toEqual([0.9, 0.05, 0.05]);
    }
  });

  it('values each option at exactly its RCDA score', () => {
    const r = computeRcda(EXAMPLE);
    const tree = buildDecisionTree(r, EXAMPLE.climate, EXAMPLE.optionNames);
    expect(tree.branches[0].expectedValue).toBeCloseTo(r.averages[0], 6);
    expect(tree.branches[1].expectedValue).toBeCloseTo(r.averages[1], 6);
  });

  it('recommends the same option as the RCDA result', () => {
    const r = computeRcda(EXAMPLE);
    const tree = buildDecisionTree(r, EXAMPLE.climate, EXAMPLE.optionNames);
    expect(tree.recommendedOption).toBe(r.recommendedOption);
    expect(tree.branches.filter((b) => b.recommended).map((b) => b.optionName)).toEqual(['atsal']);
  });

  it('leaf values are the mean of the walk inside each forecast third', () => {
    const r = computeRcda(EXAMPLE);
    const tree = buildDecisionTree(r, EXAMPLE.climate, EXAMPLE.optionNames);
    const mean = (rows: number[][], col: number) => rows.reduce((s, x) => s + x[col], 0) / rows.length;
    const [dry, avg, wet] = tree.branches[0].outcomes;
    expect(dry.value).toBeCloseTo(mean(r.profitWalk.slice(0, 90), 0), 6);
    expect(avg.value).toBeCloseTo(mean(r.profitWalk.slice(90, 95), 0), 6);
    expect(wet.value).toBeCloseTo(mean(r.profitWalk.slice(95), 0), 6);
  });

  it('holds the score equality across 200 random decisions', () => {
    const rng = makeRng(20261002);
    for (let n = 0; n < 200; n++) {
      const inputs = randomInputs(rng);
      const r = computeRcda(inputs);
      const tree = buildDecisionTree(r, inputs.climate, inputs.optionNames);
      expect(tree.branches[0].expectedValue).toBeCloseTo(r.averages[0], 4);
      expect(tree.branches[1].expectedValue).toBeCloseTo(r.averages[1], 4);
      expect(tree.recommendedOption).toBe(r.recommendedOption);
    }
  });

  it('gives a 0% third a null leaf and still matches the score', () => {
    const inputs = { ...EXAMPLE, climate: [0, 60, 40] };
    const r = computeRcda(inputs);
    const tree = buildDecisionTree(r, inputs.climate, inputs.optionNames);
    const dry = tree.branches[0].outcomes[0];
    expect(dry).toEqual({ key: 'dry', probability: 0, value: null });
    expect(Number.isFinite(tree.branches[0].expectedValue)).toBe(true);
    expect(tree.branches[0].expectedValue).toBeCloseTo(r.averages[0], 6);
  });

  it('rejects a forecast that does not add up to 100', () => {
    const r = computeRcda(EXAMPLE);
    expect(() => buildDecisionTree(r, [50, 30, 30], EXAMPLE.optionNames)).toThrow();
  });
});

describe('saved decisions', () => {
  it('collapseScenario7to5 undoes expandScenario5to7', () => {
    const five = [1, 2, 3, 4, 5];
    expect(collapseScenario7to5(expandScenario5to7(five))).toEqual(five);
    expect(collapseScenario7to5([1, 2, 3])).toEqual([]);
  });

  it('a decision read back from the database recomputes to the same result', async () => {
    // Mirrors buildOptionSnapshot() in app/(decision)/result.tsx.
    const snapshot = (i: number): Option => ({
      id: '',
      option_name: EXAMPLE.optionNames[i],
      decision_type: 'crop_choice',
      price: EXAMPLE.price[i],
      location_id: 'loc-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      ...buildOptionClimateFields(
        expandScenario5to7(EXAMPLE.yield[i]),
        expandScenario5to7(EXAMPLE.cost[i]),
        expandScenario5to7(EXAMPLE.addCost[i])
      ),
    });
    const id = await createDecision({
      decision: {
        decision_type: 'crop_choice',
        location_id: 'loc-1',
        user_id: 'user-1',
        result: 'atsal',
        profit_increase: 7042,
        climate_driest: 90,
        climate_mid: 5,
        climate_wettest: 5,
      },
      firstOption: snapshot(0),
      secondOption: snapshot(1),
    });

    const saved = await getDecision(id);
    const inputs = decisionToRcdaInputs(saved!);
    expect(inputs).toEqual(EXAMPLE);

    const original = computeRcda(EXAMPLE);
    const recomputed = computeRcda(inputs!);
    expect(recomputed.averages).toEqual(original.averages);
    expect(EXAMPLE.optionNames[recomputed.recommendedOption]).toBe(saved!.result);
  });

  it('returns null when a saved decision is missing an option', () => {
    expect(decisionToRcdaInputs({
      id: 'd', decision_type: 'crop_choice', datetime: '', location_id: '', user_id: '',
      result: '', profit_increase: 0, climate_driest: 33, climate_mid: 34, climate_wettest: 33,
      options: [],
    })).toBeNull();
  });
});

describe('division by zero', () => {
  // An option whose profit is the same in every scenario, so zero-width bands give 0/0 as well as x/0.
  const FLAT: RcdaInputs = {
    ...EXAMPLE,
    yield: [[5000, 5000, 5000, 5000, 5000], EXAMPLE.yield[1]],
    cost: [[100000, 100000, 100000, 100000, 100000], EXAMPLE.cost[1]],
    price: [50, 40],
  };

  function allForecasts(): number[][] {
    const out: number[][] = [];
    for (let d = 0; d <= 100; d++) for (let w = 0; d + w <= 100; w++) out.push([d, 100 - d - w, w]);
    return out;
  }

  it('refuses 0% average years instead of recommending an option from infinite scores', () => {
    expect(() => computeRcda({ ...EXAMPLE, climate: [60, 0, 40] })).toThrow(RcdaComputeError);
    expect(() => computeRcda({ ...FLAT, climate: [60, 0, 40] })).toThrow(RcdaComputeError);
  });

  it('never returns a non-finite result for any of the 5151 forecasts', () => {
    for (const inputs of [EXAMPLE, FLAT]) {
      for (const climate of allForecasts()) {
        let r;
        try {
          r = computeRcda({ ...inputs, climate });
        } catch (err) {
          expect(err).toBeInstanceOf(RcdaComputeError);
          continue;
        }
        expect(r.averages.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('computes every forecast the input screen allows', () => {
    const allowed = allForecasts().filter(isForecastComputable);
    expect(allowed).toHaveLength(5050);
    for (const inputs of [EXAMPLE, FLAT]) {
      for (const climate of allowed) expect(() => computeRcda({ ...inputs, climate })).not.toThrow();
    }
  });

  it('allows a forecast only when average years are at least 1%', () => {
    expect(isForecastComputable([33, 34, 33])).toBe(true);
    expect(isForecastComputable([0, 1, 99])).toBe(true);
    expect(isForecastComputable([50, 0, 50])).toBe(false);
  });
});
