import { PowerSyncContext } from '@powersync/react-native';
import React, { useEffect, useState } from 'react';
import { db } from './powersync/powersync';

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Only initialize the database — connection happens after login
      await db.init();
      setReady(true);
    }
    init();

    return () => {
      db.disconnect();
    };
  }, []);

  if (!ready) return null;

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}