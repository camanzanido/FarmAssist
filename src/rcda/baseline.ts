import { nonForecast } from './constants';
import { computeRcda, RcdaComputation, RcdaInputs } from './decisionTree';

// How this season's forecast compares with a normal (climatology) year for the same inputs.
export interface NormalYearComparison {
  forecast: number[];          // [dry, average, wet] % the user entered
  normal: number[];            // [33, 34, 33]
  forecastIsNormal: boolean;
  focusOption: 0 | 1;          // the option recommended under the forecast; the comparison talks about it
  forecastScore: number;       // focusOption's rounded expected earnings under the forecast
  normalScore: number;         // focusOption's rounded expected earnings in a normal year
  delta: number;               // forecastScore minus normalScore, from the exact averages rounded once
  normalScores: number[];      // both options' rounded expected earnings in a normal year
  normalRecommended: 0 | 1;
  normalBothNegative: boolean;
}

export function compareToNormalYear(inputs: RcdaInputs, forecast: RcdaComputation): NormalYearComparison {
  const normal = [...nonForecast];
  const forecastIsNormal = inputs.climate.length === 3 && inputs.climate.every((c, i) => Math.round(c) === normal[i]);
  // Reuse the forecast run when it already is the normal year, so both sides are identical by construction.
  const normalRun = forecastIsNormal ? forecast : computeRcda({ ...inputs, climate: normal });
  const focusOption = forecast.recommendedOption;

  return {
    forecast: [...inputs.climate],
    normal,
    forecastIsNormal,
    focusOption,
    forecastScore: Math.round(forecast.averages[focusOption]),
    normalScore: Math.round(normalRun.averages[focusOption]),
    delta: Math.round(forecast.averages[focusOption] - normalRun.averages[focusOption]),
    normalScores: normalRun.averages.map((a) => Math.round(a)),
    normalRecommended: normalRun.recommendedOption,
    normalBothNegative: normalRun.averages[0] <= 0 && normalRun.averages[1] <= 0,
  };
}
