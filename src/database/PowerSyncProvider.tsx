import { Ionicons } from '@expo/vector-icons';
import { PowerSyncContext } from '@powersync/react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { startupCopy as copy } from '../constants/copy';
import { db } from './powersync/powersync';
import { repairUnsyncableDecisions } from './repositories/decisions';

const SLOW_STARTUP_MS = 15_000;

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn(`Local database still starting after ${SLOW_STARTUP_MS / 1000}s`);
        setIsSlow(true);
      }
    }, SLOW_STARTUP_MS);

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

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('Failed to start the local database:', err);
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        clearTimeout(slowTimer);
      }
    }
    init();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      db.disconnect();
    };
  }, []);

  if (error) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <Ionicons name="warning-outline" size={32} color={Colors.danger} />
        <Text style={s.title}>{copy.errorTitle}</Text>
        <Text style={s.body}>{copy.errorBody}</Text>
        {__DEV__ && <Text style={s.detail}>{error.message}</Text>}
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={s.center} accessibilityLiveRegion="polite">
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <ActivityIndicator size="large" color={Colors.ink} />
        <Text style={s.title}>{isSlow ? copy.slowTitle : copy.starting}</Text>
        {isSlow && <Text style={s.body}>{copy.slowBody}</Text>}
      </View>
    );
  }

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 32, backgroundColor: Colors.bg,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.ink, textAlign: 'center', marginTop: 4 },
  body: { fontSize: 13, color: Colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  detail: { fontSize: 11, color: Colors.inkFaint, textAlign: 'center', marginTop: 8 },
});
