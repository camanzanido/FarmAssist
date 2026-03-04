import { PowerSyncContext } from '@powersync/react-native';
import React, { useEffect, useState } from 'react';
import { SupabaseConnector } from './connector';
import { db } from './powersync';
import { supabase } from './supabase';

const connector = new SupabaseConnector(supabase);

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await db.init();
      await db.connect(connector);
      setReady(true);
    }
    init();

    return () => {
      db.disconnect();
    };
  }, []);

  if (!ready) return null; // or a splash/loading screen

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}