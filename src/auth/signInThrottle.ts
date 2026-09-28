// Client-side limit on wrong-password attempts; Supabase Auth also rate-limits sign-ins per IP on the server.

export interface ThrottleState {
  failures: number;    // consecutive wrong-password attempts on this device
  lockedUntil: number; // epoch ms, 0 when not locked
}

export const INITIAL_THROTTLE: ThrottleState = { failures: 0, lockedUntil: 0 };
export const FREE_ATTEMPTS = 5;
export const BASE_LOCK_MS = 30_000;
export const MAX_LOCK_MS = 15 * 60_000;
export const THROTTLE_STORAGE_KEY = 'auth.signInThrottle';

// The 5th wrong attempt locks for 30s, and each one after that doubles it, up to 15 minutes.
export function recordFailure(state: ThrottleState, now: number): ThrottleState {
  const failures = state.failures + 1;
  if (failures < FREE_ATTEMPTS) return { failures, lockedUntil: 0 };
  const lockMs = Math.min(BASE_LOCK_MS * 2 ** (failures - FREE_ATTEMPTS), MAX_LOCK_MS);
  return { failures, lockedUntil: now + lockMs };
}

export function remainingLockMs(state: ThrottleState, now: number): number {
  return Math.max(0, state.lockedUntil - now);
}

// Attempts left before the next lock; 0 once the device has been locked at least once.
export function attemptsBeforeLock(state: ThrottleState): number {
  return Math.max(0, FREE_ATTEMPTS - state.failures);
}

export function formatLockTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseThrottle(raw: string | null): ThrottleState {
  if (!raw) return INITIAL_THROTTLE;
  try {
    const v = JSON.parse(raw);
    if (Number.isFinite(v?.failures) && Number.isFinite(v?.lockedUntil)) {
      return { failures: Math.max(0, v.failures), lockedUntil: Math.max(0, v.lockedUntil) };
    }
  } catch {}
  return INITIAL_THROTTLE;
}
