import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

const UNLOCK_FALLBACK_MS = 800;

// Pushes once per tap burst; the lock lifts when this screen is focused again, or after a timeout if nothing opened.
export function useNavLock() {
  const router = useRouter();
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useFocusEffect(unlock);
  useEffect(() => unlock, [unlock]);

  const push = useCallback((href: Href) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    timerRef.current = setTimeout(unlock, UNLOCK_FALLBACK_MS);
    router.push(href);
  }, [router, unlock]);

  return { push };
}
