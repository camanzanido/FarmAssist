import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector implements PowerSyncBackendConnector {
  constructor(private supabase: SupabaseClient) {}

  async fetchCredentials() {
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error('No active Supabase session found.');
    }

    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: data.session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch();
    if (!batch || batch.crud.length === 0) return;

    try {
      for (const entry of batch.crud) {
        const { op, table, opData } = entry;

        if (op === 'PUT') {
          const { error } = await this.supabase.from(table).upsert(opData);
          if (error) throw error;
        } else if (op === 'PATCH') {
          const { error } = await this.supabase
            .from(table)
            .update(opData)
            .eq('id', opData?.id);
          if (error) throw error;
        } else if (op === 'DELETE') {
          const { error } = await this.supabase
            .from(table)
            .delete()
            .eq('id', opData?.id);
          if (error) throw error;
        }
      }
      await batch.complete();
    } catch (e) {
      console.error('Upload failed:', e);
      throw e;
    }
  }
}