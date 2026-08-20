/**
 * A lightweight stand-in for src/database/powersync/powersync.ts's `db`
 * export, backed by sql.js (SQLite compiled to WASM) instead of the real
 * @powersync/op-sqlite native binding.
 *
 * The real `db` only runs inside a React Native app (native SQLite via
 * op-sqlite). Repository tests run under plain Node/Jest, so this fake
 * implements the same execute/getAll/getOptional/writeTransaction surface
 * against a real, ephemeral SQLite database — giving genuine integration
 * coverage (real SQL, real transactions/rollback) for the repository layer
 * without needing a device/emulator.
 */
import initSqlJs, { Database } from 'sql.js';

export interface FakeTx {
  execute: (sql: string, params?: unknown[]) => Promise<void>;
  getAll: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  getOptional: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
}

export interface FakeDb extends FakeTx {
  writeTransaction: <T>(callback: (tx: FakeTx) => Promise<T>) => Promise<T>;
}

let rawDb: Database | null = null;

const SCHEMA_SQL = `
  CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    decision_type TEXT,
    datetime TEXT,
    location_id TEXT,
    user_id TEXT,
    result TEXT,
    profit_increase REAL,
    climate_driest REAL,
    climate_mid REAL,
    climate_wettest REAL
  );

  CREATE TABLE decision_options (
    id TEXT PRIMARY KEY,
    decision_id TEXT,
    option_slot INTEGER,
    option_name TEXT,
    price REAL,
    cost_driest REAL,
    cost_very_dry REAL,
    cost_below_avg REAL,
    cost_average REAL,
    cost_above_avg REAL,
    cost_very_good REAL,
    cost_wettest REAL,
    add_cost_driest REAL,
    add_cost_very_dry REAL,
    add_cost_below_avg REAL,
    add_cost_average REAL,
    add_cost_above_avg REAL,
    add_cost_very_good REAL,
    add_cost_wettest REAL,
    yield_driest REAL,
    yield_very_dry REAL,
    yield_below_avg REAL,
    yield_average REAL,
    yield_above_avg REAL,
    yield_very_good REAL,
    yield_wettest REAL
  );
`;

async function execute(sql: string, params: unknown[] = []): Promise<void> {
  if (!rawDb) throw new Error('fake-db: call initFakeDb() first');
  rawDb.run(sql, params as never[]);
}

async function getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!rawDb) throw new Error('fake-db: call initFakeDb() first');
  const stmt = rawDb.prepare(sql);
  try {
    stmt.bind(params as never[]);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    return rows;
  } finally {
    stmt.free();
  }
}

async function getOptional<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await getAll<T>(sql, params);
  return rows[0] ?? null;
}

async function writeTransaction<T>(callback: (tx: FakeTx) => Promise<T>): Promise<T> {
  if (!rawDb) throw new Error('fake-db: call initFakeDb() first');
  rawDb.run('BEGIN');
  try {
    const result = await callback({ execute, getAll, getOptional });
    rawDb.run('COMMIT');
    return result;
  } catch (err) {
    rawDb.run('ROLLBACK');
    throw err;
  }
}

export const fakeDb: FakeDb = { execute, getAll, getOptional, writeTransaction };

export async function initFakeDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
  });
  rawDb = new SQL.Database();
  rawDb.run(SCHEMA_SQL);
}

export async function resetFakeDb(): Promise<void> {
  if (!rawDb) throw new Error('fake-db: call initFakeDb() first');
  rawDb.run('DELETE FROM decision_options; DELETE FROM decisions;');
}

export function closeFakeDb(): void {
  rawDb?.close();
  rawDb = null;
}
