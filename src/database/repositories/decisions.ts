// db/decisions.ts
import { Transaction } from '@powersync/react-native';
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

// ---------------------------------------------------------------------------
// Synced tables vs. local staging tables.
//
// A decision is only syncable once it has a real user_id AND location_id.
// Until then it lives in the local_* twins, which PowerSync never uploads —
// see the comment on local_decisions in src/database/schema.ts for why an
// unsyncable row must never touch the synced tables.
// ---------------------------------------------------------------------------
const DECISIONS = 'decisions';
const DECISION_OPTIONS = 'decision_options';
const LOCAL_DECISIONS = 'local_decisions';
const LOCAL_DECISION_OPTIONS = 'local_decision_options';

const DECISION_COLUMNS = [
  'id', 'decision_type', 'datetime', 'location_id', 'user_id',
  'result', 'profit_increase',
  'climate_driest', 'climate_mid', 'climate_wettest',
] as const;

const DECISION_OPTION_COLUMNS = [
  'id', 'decision_id', 'option_slot', 'option_name', 'price',
  'cost_driest', 'cost_very_dry', 'cost_below_avg', 'cost_average', 'cost_above_avg', 'cost_very_good', 'cost_wettest',
  'add_cost_driest', 'add_cost_very_dry', 'add_cost_below_avg', 'add_cost_average', 'add_cost_above_avg', 'add_cost_very_good', 'add_cost_wettest',
  'yield_driest', 'yield_very_dry', 'yield_below_avg', 'yield_average', 'yield_above_avg', 'yield_very_good', 'yield_wettest',
] as const;

const decisionCols = DECISION_COLUMNS.join(', ');
const decisionOptionCols = DECISION_OPTION_COLUMNS.join(', ');

// Reads must span both tables — a user's history mixes synced decisions with
// ones still staged (e.g. created before their location had downloaded).
const ALL_DECISIONS = `
  SELECT ${decisionCols} FROM ${DECISIONS}
  UNION ALL
  SELECT ${decisionCols} FROM ${LOCAL_DECISIONS}
`;

/** A row is unsyncable while either uuid foreign key is still a placeholder. */
export function needsStaging(decision: { user_id: string; location_id: string }): boolean {
  return !decision.user_id || !decision.location_id;
}

function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}

async function insertRow<T extends object>(
  tx: Transaction,
  table: string,
  columns: readonly string[],
  row: T
): Promise<void> {
  const values = row as Record<string, unknown>;
  await tx.execute(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders(columns.length)})`,
    columns.map((c) => values[c] ?? null)
  );
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

// Main entry point: save a full decision with its two option snapshots atomically
export async function createDecision(params: {
  decision: Omit<Decision, 'id' | 'datetime'>;
  firstOption: Option;
  secondOption: Option;
}): Promise<string> {
  const decisionId = generateId();
  const datetime = new Date().toISOString();

  const staged = needsStaging(params.decision);
  const decisionsTable = staged ? LOCAL_DECISIONS : DECISIONS;
  const optionsTable = staged ? LOCAL_DECISION_OPTIONS : DECISION_OPTIONS;

  await db.writeTransaction(async (tx) => {
    await insertRow(tx, decisionsTable, DECISION_COLUMNS, {
      ...params.decision,
      id: decisionId,
      datetime,
    });

    await insertRow(tx, optionsTable, DECISION_OPTION_COLUMNS, {
      ...snapshotOption(decisionId, 0, params.firstOption),
      id: generateId(),
    });
    await insertRow(tx, optionsTable, DECISION_OPTION_COLUMNS, {
      ...snapshotOption(decisionId, 1, params.secondOption),
      id: generateId(),
    });
  });

  return decisionId;
}

export async function getDecision(decisionId: string): Promise<DecisionWithOptions | null> {
  let decision = await db.getOptional<Decision>(
    `SELECT ${decisionCols} FROM ${DECISIONS} WHERE id = ?`,
    [decisionId]
  );
  let optionsTable = DECISION_OPTIONS;

  if (!decision) {
    decision = await db.getOptional<Decision>(
      `SELECT ${decisionCols} FROM ${LOCAL_DECISIONS} WHERE id = ?`,
      [decisionId]
    );
    optionsTable = LOCAL_DECISION_OPTIONS;
  }
  if (!decision) return null;

  const options = await db.getAll<DecisionOption>(
    `SELECT ${decisionOptionCols} FROM ${optionsTable} WHERE decision_id = ? ORDER BY option_slot ASC`,
    [decisionId]
  );

  return { ...decision, options };
}

/**
 * A user's decisions, including any still-unclaimed ones created on this device
 * before sign-in.
 *
 * The `user_id = ''` arm matters: a decision made while signed out keeps its
 * placeholder id until the claim runs, and the claim can legitimately be
 * deferred (no location yet). Without this the decision would vanish from its
 * own author's history the moment they signed in. Unclaimed rows belong to
 * whoever signs in on this device, which is exactly what claimLocalDecisions
 * already assumes.
 */
export async function getDecisionsByUser(
  userId: string,
  decisionType?: string
): Promise<Decision[]> {
  if (decisionType) {
    return db.getAll<Decision>(
      `SELECT * FROM (${ALL_DECISIONS})
       WHERE (user_id = ? OR user_id = '') AND decision_type = ?
       ORDER BY datetime DESC`,
      [userId, decisionType]
    );
  }
  return db.getAll<Decision>(
    `SELECT * FROM (${ALL_DECISIONS}) WHERE user_id = ? OR user_id = '' ORDER BY datetime DESC`,
    [userId]
  );
}

export async function getDecisionsByLocation(locationId: string): Promise<Decision[]> {
  return db.getAll<Decision>(
    `SELECT * FROM (${ALL_DECISIONS}) WHERE location_id = ? ORDER BY datetime DESC`,
    [locationId]
  );
}

export async function getAllDecisions(): Promise<Decision[]> {
  return db.getAll<Decision>(`SELECT * FROM (${ALL_DECISIONS}) ORDER BY datetime DESC`);
}

/**
 * Ids of decisions still sitting in local staging.
 *
 * These never enter PowerSync's upload queue, so a caller checking only
 * getCrudBatch() would wrongly conclude they have already been sent. They are
 * the opposite: not yet syncable at all.
 */
export async function getStagedDecisionIds(): Promise<string[]> {
  const rows = await db.getAll<{ id: string }>(`SELECT id FROM ${LOCAL_DECISIONS}`);
  return rows.map((r) => r.id);
}

/**
 * Move staged decisions into the synced tables under a real identity.
 *
 * Copy-then-delete, not UPDATE: the row has to arrive in `decisions` as a fresh
 * INSERT so PowerSync queues a PUT already carrying valid uuids. Updating a row
 * that was inserted with placeholders cannot work — the queued PUT's payload is
 * frozen at insert time, so an UPDATE only adds a second, separate PATCH.
 *
 * Returns the number of decisions claimed.
 */
export async function claimLocalDecisions(userId: string, locationId: string): Promise<number> {
  // Without both ids the rows would be just as unsyncable in `decisions` as
  // they are here, so leave them staged for a later attempt rather than
  // promoting them into a guaranteed 22P02 discard.
  if (!userId || !locationId) return 0;

  // Read outside the write transaction — never call db.* inside writeTransaction.
  const staged = await db.getAll<Decision>(`SELECT ${decisionCols} FROM ${LOCAL_DECISIONS}`);
  if (staged.length === 0) return 0;

  const ids = staged.map((d) => d.id);
  const options = await db.getAll<DecisionOption>(
    `SELECT ${decisionOptionCols} FROM ${LOCAL_DECISION_OPTIONS}
     WHERE decision_id IN (${placeholders(ids.length)})`,
    ids
  );

  await db.writeTransaction(async (tx) => {
    for (const decision of staged) {
      await insertRow(tx, DECISIONS, DECISION_COLUMNS, {
        ...decision,
        user_id: userId,
        location_id: locationId,
      });
    }
    for (const option of options) {
      await insertRow(tx, DECISION_OPTIONS, DECISION_OPTION_COLUMNS, option);
    }

    await tx.execute(
      `DELETE FROM ${LOCAL_DECISION_OPTIONS} WHERE decision_id IN (${placeholders(ids.length)})`,
      ids
    );
    await tx.execute(
      `DELETE FROM ${LOCAL_DECISIONS} WHERE id IN (${placeholders(ids.length)})`,
      ids
    );
  });

  return staged.length;
}

/**
 * One-time repair for decisions written to the synced tables before staging
 * existed. Their placeholder uuids were already rejected (22P02) and the
 * transaction discarded, so they exist locally but will never reach Supabase.
 * Moving them into staging lets the normal claim path pick them up.
 *
 * Deleting them from `decisions` queues DELETE ops for rows Supabase never
 * received; `.delete().eq('id', ...)` matches nothing and returns no error, so
 * that is harmless.
 *
 * Returns the number of decisions moved into staging.
 */
export async function repairUnsyncableDecisions(): Promise<number> {
  const broken = await db.getAll<Decision>(
    `SELECT ${decisionCols} FROM ${DECISIONS}
     WHERE user_id IS NULL OR user_id = '' OR location_id IS NULL OR location_id = ''`
  );
  if (broken.length === 0) return 0;

  const ids = broken.map((d) => d.id);
  const options = await db.getAll<DecisionOption>(
    `SELECT ${decisionOptionCols} FROM ${DECISION_OPTIONS}
     WHERE decision_id IN (${placeholders(ids.length)})`,
    ids
  );

  await db.writeTransaction(async (tx) => {
    for (const decision of broken) {
      await insertRow(tx, LOCAL_DECISIONS, DECISION_COLUMNS, decision);
    }
    for (const option of options) {
      await insertRow(tx, LOCAL_DECISION_OPTIONS, DECISION_OPTION_COLUMNS, option);
    }

    await tx.execute(
      `DELETE FROM ${DECISION_OPTIONS} WHERE decision_id IN (${placeholders(ids.length)})`,
      ids
    );
    await tx.execute(
      `DELETE FROM ${DECISIONS} WHERE id IN (${placeholders(ids.length)})`,
      ids
    );
  });

  return broken.length;
}

export async function deleteDecision(decisionId: string): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM ${DECISION_OPTIONS} WHERE decision_id = ?`, [decisionId]);
    await tx.execute(`DELETE FROM ${DECISIONS} WHERE id = ?`, [decisionId]);
    await tx.execute(`DELETE FROM ${LOCAL_DECISION_OPTIONS} WHERE decision_id = ?`, [decisionId]);
    await tx.execute(`DELETE FROM ${LOCAL_DECISIONS} WHERE id = ?`, [decisionId]);
  });
}
