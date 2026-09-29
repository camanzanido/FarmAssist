// The 7 stored climate points for yield, cost and additional cost, shared by decision_options and predefined_options.
export interface OptionClimateFields {
  cost_driest: number;
  cost_very_dry: number;
  cost_below_avg: number;
  cost_average: number;
  cost_above_avg: number;
  cost_very_good: number;
  cost_wettest: number;

  add_cost_driest: number;
  add_cost_very_dry: number;
  add_cost_below_avg: number;
  add_cost_average: number;
  add_cost_above_avg: number;
  add_cost_very_good: number;
  add_cost_wettest: number;

  yield_driest: number;
  yield_very_dry: number;
  yield_below_avg: number;
  yield_average: number;
  yield_above_avg: number;
  yield_very_good: number;
  yield_wettest: number;
}

const CLIMATE_KEYS = [
  'driest', 'very_dry', 'below_avg', 'average', 'above_avg', 'very_good', 'wettest',
] as const;

export function buildOptionClimateFields(
  yield7: number[],
  cost7: number[],
  addCost7: number[]
): OptionClimateFields {
  const fields = {} as Record<string, number>;
  CLIMATE_KEYS.forEach((key, i) => {
    fields[`yield_${key}`] = yield7[i];
    fields[`cost_${key}`] = cost7[i];
    fields[`add_cost_${key}`] = addCost7[i];
  });
  return fields as unknown as OptionClimateFields;
}
