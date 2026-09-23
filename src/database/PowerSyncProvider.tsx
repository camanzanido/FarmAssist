import { PowerSyncContext } from '@powersync/react-native';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { db } from './powersync/powersync';
import { repairUnsyncableDecisions } from './repositories/decisions';

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Only initialize the database — connection happens after login
        await db.init();

        try {
          const repaired = await repairUnsyncableDecisions();
          if (repaired > 0) {
            console.warn(`Moved ${repaired} unsyncable decision(s) into local staging`);
          }
        } catch (repairErr) {
          console.error('Could not repair unsyncable decisions:', repairErr);
        }

        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    init();

    return () => {
      db.disconnect();
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Failed to start the local database.</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }

  if (!ready) return null;

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}