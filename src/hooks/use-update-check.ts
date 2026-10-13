import { LatestRelease, newerRelease, parseLatestRelease, RELEASES_URL } from '@/src/utils/appVersion';
import { withTimeout } from '@/src/utils/withTimeout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useCallback, useEffect, useState } from 'react';

const DISMISSED_KEY = 'update_check.dismissed_version';

// Cache a successful lookup for the session (GitHub allows 60 unauthenticated calls/hour); a failed one is retried on the next mount.
let latestPromise: Promise<LatestRelease | null> | null = null;

function fetchLatest(): Promise<LatestRelease | null> {
  latestPromise ??= withTimeout(signal =>
    fetch(RELEASES_URL, { signal, headers: { Accept: 'application/vnd.github+json' } })
      .then(res => (res.ok ? res.json() : null))
      .then(parseLatestRelease)
  )
    .catch(() => null)
    .then(found => {
      if (!found) latestPromise = null;
      return found;
    });
  return latestPromise;
}

export function useUpdateCheck() {
  const [update, setUpdate] = useState<LatestRelease | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = newerRelease(Application.nativeApplicationVersion, await fetchLatest());
      if (!found) return;
      const dismissed = await AsyncStorage.getItem(DISMISSED_KEY).catch(() => null);
      if (!cancelled && dismissed !== found.version) setUpdate(found);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(() => {
    if (!update) return;
    AsyncStorage.setItem(DISMISSED_KEY, update.version).catch(() => {});
    setUpdate(null);
  }, [update]);

  return { update, dismiss };
}
