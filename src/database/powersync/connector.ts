import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType
} from '@powersync/react-native';
import { SupabaseClient } from '@supabase/supabase-js';
import { logSyncError } from '../repositories/syncErrors';

const FATAL_RESPONSE_CODES = [
  new RegExp('^22...$'),     // Postgres Data Exception (type mismatch etc.)
  new RegExp('^23...$'),     // Postgres Integrity Constraint Violation (NOT NULL, FOREIGN KEY, UNIQUE)
  new RegExp('^PGRST1\\d\\d$'), // PostgREST malformed request (bad column/type in payload)
  new RegExp('^PGRST2\\d\\d$'), // PostgREST schema cache miss (unknown table/column/relationship)
];

export class SupabaseConnector implements PowerSyncBackendConnector {
  constructor(private supabase: SupabaseClient) {}

  async fetchCredentials() {
    const {
      data: { session },
      error
    } = await this.supabase.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    console.debug('Session expires at', session.expires_at);

    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token ?? '',
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
      userID: session.user.id
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: CrudEntry | null = null;

    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.supabase.from(op.table);
        let result: any = null;

        switch (op.op) {
          case UpdateType.PUT:
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }

        if (result.error) {
          result.error.message = `Could not ${op.op} data to Supabase: ${JSON.stringify(result.error)}`;
          throw result.error;
        }
      }

      await transaction.complete();

    } catch (ex: any) {
      if (
        typeof ex.code === 'string' &&
        FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))
      ) {
        // Fatal error — discard transaction instead of blocking the queue
        console.error('Fatal upload error - discarding transaction:', lastOp, ex);
        if (lastOp) {

          await logSyncError({
            table_name: lastOp.table,
            operation: String(lastOp.op),
            error_code: ex.code,
            error_message: ex.message ?? String(ex),
            record_id: lastOp.id,
          }).catch((logErr) => console.error('Failed to record sync error:', logErr));
        }
        await transaction.complete();
      } else {
        // Retryable error (network, temp server error) — throw to retry later
        throw ex;
      }
    }
  }
}