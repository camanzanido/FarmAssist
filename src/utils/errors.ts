function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return String(err);
}

function errCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) return String((err as any).code);
  return undefined;
}

function isNetworkError(err: unknown): boolean {
  const msg = errMessage(err).toLowerCase();
  return msg.includes('network') || msg.includes('fetch failed') || msg.includes('failed to fetch');
}

const OFFLINE_MESSAGE = "Check your internet connection and try again.";
const PERMISSION_MESSAGE = "You don't have permission to do this.";

const AUTH_MESSAGE_OVERRIDES: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
};

const RATE_LIMIT_MESSAGE = 'Too many sign-in attempts. Please wait a few minutes and try again.';

// A wrong email or password, as opposed to a network or server problem; only these count toward the sign-in limit.
export function isInvalidCredentialsError(err: unknown): boolean {
  return errCode(err) === 'invalid_credentials' || errMessage(err).includes('Invalid login credentials');
}

function isRateLimitError(err: unknown): boolean {
  const status = err && typeof err === 'object' && 'status' in err ? (err as any).status : undefined;
  return status === 429 || errCode(err) === 'over_request_rate_limit';
}


export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
  if (isRateLimitError(err)) return RATE_LIMIT_MESSAGE;
  const msg = errMessage(err);
  for (const key of Object.keys(AUTH_MESSAGE_OVERRIDES)) {
    if (msg.includes(key)) return AUTH_MESSAGE_OVERRIDES[key];
  }
  return msg || fallback;
}


export function getActionErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
  if (errCode(err) === '42501') return PERMISSION_MESSAGE;
  return fallback;
}
