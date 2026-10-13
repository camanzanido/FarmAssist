import { compareToNormalYear } from '../../src/rcda/baseline';
import { nonForecast } from '../../src/rcda/constants';
import { computeRcda, RcdaInputs } from '../../src/rcda/decisionTree';

// Same worked example as tests/rcda/summary.test.ts: cabbage vs. atsal.
const EXAMPLE: RcdaInputs = {
  optionNames: ['cabbage', 'atsal'],
  yield: [[0, 3000, 8000, 12000, 10000], [0, 8000, 10000, 5000, 0]],
  cost: [[20000, 100000, 150000, 150000, 170000], [30000, 100000, 100000, 120000, 30000]],
  addCost: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
  price: [70, 40],
  climate: [90, 5, 5],
};

const compare = (climate: number[]) => {
  const inputs = { ...EXAMPLE, climate };
  return compareToNormalYear(inputs, computeRcda(inputs));
};

describe('compareToNormalYear', () => {
  it('reports no difference when the forecast is the normal 33/34/33 year', () => {
    const c = compare([33, 34, 33]);
    expect(c.forecastIsNormal).toBe(true);
    expect(c.delta).toBe(0);
    expect(c.forecastScore).toBe(c.normalScore);
    expect(c.normalRecommended).toBe(c.focusOption);
  });

  it('matches a separate RCDA run under the normal year', () => {
    const c = compare([90, 5, 5]);
    const normalRun = computeRcda({ ...EXAMPLE, climate: [...nonForecast] });
    expect(c.forecastIsNormal).toBe(false);
    expect(c.normal).toEqual([33, 34, 33]);
    expect(c.normalScores).toEqual(normalRun.averages.map(Math.round));
    expect(c.normalRecommended).toBe(normalRun.recommendedOption);
  });

  it('talks about the option recommended under the forecast', () => {
    const forecast = computeRcda(EXAMPLE);
    const c = compare(EXAMPLE.climate);
    expect(c.focusOption).toBe(forecast.recommendedOption);
    expect(c.forecastScore).toBe(Math.round(forecast.averages[c.focusOption]));
    expect(c.delta).toBe(Math.round(forecast.averages[c.focusOption] - computeRcda({ ...EXAMPLE, climate: [33, 34, 33] }).averages[c.focusOption]));
  });

  it('is negative when a drier forecast hurts an option that earns most in wet years', () => {
    // Cabbage earns most in average-to-wet years, so a very dry forecast must look worse than normal for it.
    const dry = { ...EXAMPLE, price: [200, 1] };
    const c = compareToNormalYear({ ...dry, climate: [80, 10, 10] }, computeRcda({ ...dry, climate: [80, 10, 10] }));
    expect(c.focusOption).toBe(0);
    expect(c.delta).toBeLessThan(0);
  });
});
