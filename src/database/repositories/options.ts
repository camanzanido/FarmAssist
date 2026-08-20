// db/options.ts
import { db } from '../powersync/powersync';
import { generateId } from './utils';

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

export interface Option extends OptionClimateFields {
  id: string;
  option_name: string;
  decision_type: string;
  price: number;
  location_id: string;
  user_id: string;
  created_at: string;
}

// Helper to map flat DB row → arrays for computeResult
export function optionToComputeParams(option: Option) {
  return {
    optionName: option.option_name,
    price: option.price,
    cost: [
      option.cost_driest,
      option.cost_very_dry,
      option.cost_below_avg,
      option.cost_average,
      option.cost_above_avg,
      option.cost_very_good,
      option.cost_wettest,
    ],
    addCost: [
      option.add_cost_driest,
      option.add_cost_very_dry,
      option.add_cost_below_avg,
      option.add_cost_average,
      option.add_cost_above_avg,
      option.add_cost_very_good,
      option.add_cost_wettest,
    ],
    yield: [
      option.yield_driest,
      option.yield_very_dry,
      option.yield_below_avg,
      option.yield_average,
      option.yield_above_avg,
      option.yield_very_good,
      option.yield_wettest,
    ],
  };
}

const CLIMATE_KEYS = [
  'driest', 'very_dry', 'below_avg', 'average', 'above_avg', 'very_good', 'wettest',
] as const;

// Inverse of optionToComputeParams: pack 7-value yield/cost/addCost arrays
// (see expandScenario5to7 in src/rcda/financials.ts) into the named DB columns.
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

export async function getOptionsByUser(
  userId: string,
  decisionType?: string
): Promise<Option[]> {
  if (decisionType) {
    return db.getAll<Option>(
      'SELECT * FROM options WHERE user_id = ? AND decision_type = ? ORDER BY option_name ASC',
      [userId, decisionType]
    );
  }
  return db.getAll<Option>(
    'SELECT * FROM options WHERE user_id = ? ORDER BY option_name ASC',
    [userId]
  );
}

export async function getOption(optionId: string): Promise<Option | null> {
  const result = await db.getOptional<Option>(
    'SELECT * FROM options WHERE id = ?',
    [optionId]
  );
  return result ?? null;
}

export async function createOption(
  data: Omit<Option, 'id' | 'created_at'>
): Promise<string> {
  const id = generateId();
  await db.execute(
    `INSERT INTO options (
      id, option_name, decision_type, price, location_id, user_id, created_at,
      cost_driest, cost_very_dry, cost_below_avg, cost_average, cost_above_avg, cost_very_good, cost_wettest,
      add_cost_driest, add_cost_very_dry, add_cost_below_avg, add_cost_average, add_cost_above_avg, add_cost_very_good, add_cost_wettest,
      yield_driest, yield_very_dry, yield_below_avg, yield_average, yield_above_avg, yield_very_good, yield_wettest
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.option_name, data.decision_type, data.price,
      data.location_id, data.user_id, new Date().toISOString(),
      data.cost_driest, data.cost_very_dry, data.cost_below_avg, data.cost_average, data.cost_above_avg, data.cost_very_good, data.cost_wettest,
      data.add_cost_driest, data.add_cost_very_dry, data.add_cost_below_avg, data.add_cost_average, data.add_cost_above_avg, data.add_cost_very_good, data.add_cost_wettest,
      data.yield_driest, data.yield_very_dry, data.yield_below_avg, data.yield_average, data.yield_above_avg, data.yield_very_good, data.yield_wettest,
    ]
  );
  return id;
}

export async function updateOption(
  optionId: string,
  fields: Partial<Omit<Option, 'id' | 'created_at' | 'user_id'>>
): Promise<void> {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, val]) => val);

  await db.execute(
    `UPDATE options SET ${setClauses} WHERE id = ?`,
    [...values, optionId]
  );
}

export async function deleteOption(optionId: string): Promise<void> {
  await db.execute('DELETE FROM options WHERE id = ?', [optionId]);
}