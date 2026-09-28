import {
  attemptsBeforeLock,
  INITIAL_THROTTLE,
  parseThrottle,
  recordFailure,
  remainingLockMs,
  THROTTLE_STORAGE_KEY,
  ThrottleState,
} from '@/src/auth/signInThrottle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Persisted so closing and reopening the app doesn't reset the lock.
export function useSignInThrottle() {
  const [state, setState] = useState<ThrottleState>(INITIAL_THROTTLE);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(THROTTLE_STORAGE_KEY)
      .then((raw) => {
        setState(parseThrottle(raw));
        setNow(Date.now());
      })
      .catch(() => {});
  }, []);

  const lockMs = remainingLockMs(state, now);
  const isLocked = lockMs > 0;

  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  const onFailure = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((prev) => {
      const next = recordFailure(prev, at);
      AsyncStorage.setItem(THROTTLE_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const onSuccess = useCallback(() => {
    setState(INITIAL_THROTTLE);
    AsyncStorage.removeItem(THROTTLE_STORAGE_KEY).catch(() => {});
  }, []);

  return { isLocked, lockMs, failures: state.failures, attemptsLeft: attemptsBeforeLock(state), onFailure, onSuccess };
}
