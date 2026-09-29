import { Decision, OptionSnapshot } from '../../src/database/repositories/decisions';

export function makeOption(overrides: Partial<OptionSnapshot> = {}): OptionSnapshot {
  return {
    option_name: 'Cabbage',
    price: 70,

    cost_driest: 20000,
    cost_very_dry: 20000,
    cost_below_avg: 100000,
    cost_average: 150000,
    cost_above_avg: 150000,
    cost_very_good: 170000,
    cost_wettest: 170000,

    add_cost_driest: 0,
    add_cost_very_dry: 0,
    add_cost_below_avg: 0,
    add_cost_average: 0,
    add_cost_above_avg: 0,
    add_cost_very_good: 0,
    add_cost_wettest: 0,

    yield_driest: 0,
    yield_very_dry: 900,
    yield_below_avg: 3000,
    yield_average: 8000,
    yield_above_avg: 12000,
    yield_very_good: 10666.666666666666,
    yield_wettest: 10000,

    ...overrides,
  };
}

export function makeDecisionInput(
  overrides: Partial<Omit<Decision, 'id' | 'datetime'>> = {}
): Omit<Decision, 'id' | 'datetime'> {
  return {
    decision_type: 'crop_choice',
    location_id: 'loc-1',
    user_id: 'user-1',
    result: 'Cabbage',
    profit_increase: 7042,
    climate_driest: 90,
    climate_mid: 5,
    climate_wettest: 5,
    ...overrides,
  };
}
