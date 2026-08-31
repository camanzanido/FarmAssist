// db/syncErrors.ts
import { db } from '../powersync/powersync';
import { generateId } from './utils';

export interface SyncErrorRecord {
  id: string;
  table_name: string;
  operation: string;
  error_code: string;
  error_message: string;
  record_id: string;
  occurred_at: string;
}

const MAX_RETAINED = 20;

export async function logSyncError(entry: {
  table_name: string;
  operation: string;
  error_code: string;
  error_message: string;
  record_id: string;
}): Promise<void> {
  await db.execute(
    `INSERT INTO sync_errors (id, table_name, operation, error_code, error_message, record_id, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      entry.table_name,
      entry.operation,
      entry.error_code,
      entry.error_message,
      entry.record_id,
      new Date().toISOString(),
    ]
  );

  await db.execute(
    `DELETE FROM sync_errors WHERE id NOT IN (
       SELECT id FROM sync_errors ORDER BY occurred_at DESC LIMIT ?
     )`,
    [MAX_RETAINED]
  );
}

export async function getRecentSyncErrors(limit = 5): Promise<SyncErrorRecord[]> {
  return db.getAll<SyncErrorRecord>(
    'SELECT * FROM sync_errors ORDER BY occurred_at DESC LIMIT ?',
    [limit]
  );
}

export async function clearSyncErrors(): Promise<void> {
  await db.execute('DELETE FROM sync_errors');
}
