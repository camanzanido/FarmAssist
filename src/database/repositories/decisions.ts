// db/decisions.ts
import { db } from '../powersync/powersync';
import { Option, OptionClimateFields } from './options';
import { generateId } from './utils';

export interface Decision {
  id: string;
  decision_type: string;
  datetime: string;
  location_id: string;
  user_id: string;
  result: string;
  profit_increase: number;
  climate_driest: number;
  climate_mid: number;
  climate_wettest: number;
}

export interface DecisionOption extends OptionClimateFields {
  id: string;
  decision_id: string;
  option_slot: number; // 0 = first, 1 = second
  option_name: string;
  price: number;
}

export interface DecisionWithOptions extends Decision {
  options: DecisionOption[];
}

// Snapshot an Option row into a DecisionOption insert payload
function snapshotOption(
  decisionId: string,
  slot: number,
  option: Option
): Omit<DecisionOption, 'id'> {
  return {
    decision_id: decisionId,
    option_slot: slot,
    option_name: option.option_name,
    price: option.price,
    cost_driest: option.cost_driest,
    cost_very_dry: option.cost_very_dry,
    cost_below_avg: option.cost_below_avg,
    cost_average: option.cost_average,
    cost_above_avg: option.cost_above_avg,
    cost_very_good: option.cost_very_good,
    cost_wettest: option.cost_wettest,
    add_cost_driest: option.add_cost_driest,
    add_cost_very_dry: option.add_cost_very_dry,
    add_cost_below_avg: option.add_cost_below_avg,
    add_cost_average: option.add_cost_average,
    add_cost_above_avg: option.add_cost_above_avg,
    add_cost_very_good: option.add_cost_very_good,
    add_cost_wettest: option.add_cost_wettest,
    yield_driest: option.yield_driest,
    yield_very_dry: option.yield_very_dry,
    yield_below_avg: option.yield_below_avg,
    yield_average: option.yield_average,
    yield_above_avg: option.yield_above_avg,
    yield_very_good: option.yield_very_good,
    yield_wettest: option.yield_wettest,
  };
}

async function insertDecisionOption(data: Omit<DecisionOption, 'id'>): Promise<void> {
  const id = generateId();
  await db.execute(
    `INSERT INTO decision_options (
      id, decision_id, option_slot, option_name, price,
      cost_driest, cost_very_dry, cost_below_avg, cost_average, cost_above_avg, cost_very_good, cost_wettest,
      add_cost_driest, add_cost_very_dry, add_cost_below_avg, add_cost_average, add_cost_above_avg, add_cost_very_good, add_cost_wettest,
      yield_driest, yield_very_dry, yield_below_avg, yield_average, yield_above_avg, yield_very_good, yield_wettest
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.decision_id, data.option_slot, data.option_name, data.price,
      data.cost_driest, data.cost_very_dry, data.cost_below_avg, data.cost_average, data.cost_above_avg, data.cost_very_good, data.cost_wettest,
      data.add_cost_driest, data.add_cost_very_dry, data.add_cost_below_avg, data.add_cost_average, data.add_cost_above_avg, data.add_cost_very_good, data.add_cost_wettest,
      data.yield_driest, data.yield_very_dry, data.yield_below_avg, data.yield_average, data.yield_above_avg, data.yield_very_good, data.yield_wettest,
    ]
  );
}

// Main entry point: save a full decision with its two option snapshots atomically
export async function createDecision(params: {
  decision: Omit<Decision, 'id' | 'datetime'>;
  firstOption: Option;
  secondOption: Option;
}): Promise<string> {
  const decisionId = generateId();
  const datetime = new Date().toISOString();

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO decisions (
        id, decision_type, datetime, location_id, user_id,
        result, profit_increase,
        climate_driest, climate_mid, climate_wettest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        decisionId,
        params.decision.decision_type,
        datetime,
        params.decision.location_id,
        params.decision.user_id,
        params.decision.result,
        params.decision.profit_increase,
        params.decision.climate_driest,
        params.decision.climate_mid,
        params.decision.climate_wettest,
      ]
    );

    await insertDecisionOption(snapshotOption(decisionId, 0, params.firstOption));
    await insertDecisionOption(snapshotOption(decisionId, 1, params.secondOption));
  });

  return decisionId;
}

export async function getDecision(decisionId: string): Promise<DecisionWithOptions | null> {
  const decision = await db.getOptional<Decision>(
    'SELECT * FROM decisions WHERE id = ?',
    [decisionId]
  );
  if (!decision) return null;

  const options = await db.getAll<DecisionOption>(
    'SELECT * FROM decision_options WHERE decision_id = ? ORDER BY option_slot ASC',
    [decisionId]
  );

  return { ...decision, options };
}

export async function getDecisionsByUser(
  userId: string,
  decisionType?: string
): Promise<Decision[]> {
  if (decisionType) {
    return db.getAll<Decision>(
      'SELECT * FROM decisions WHERE user_id = ? AND decision_type = ? ORDER BY datetime DESC',
      [userId, decisionType]
    );
  }
  return db.getAll<Decision>(
    'SELECT * FROM decisions WHERE user_id = ? ORDER BY datetime DESC',
    [userId]
  );
}

export async function getDecisionsByLocation(locationId: string): Promise<Decision[]> {
  return db.getAll<Decision>(
    'SELECT * FROM decisions WHERE location_id = ? ORDER BY datetime DESC',
    [locationId]
  );
}

// Decisions are immutable records — no update function intentionally.
// Delete cascades to decision_options via app logic since SQLite
// won't enforce FK constraints automatically in PowerSync.
export async function deleteDecision(decisionId: string): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM decision_options WHERE decision_id = ?', [decisionId]);
    await tx.execute('DELETE FROM decisions WHERE id = ?', [decisionId]);
  });
}