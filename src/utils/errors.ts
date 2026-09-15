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


export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
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
