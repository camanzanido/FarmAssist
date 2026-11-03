import { getCopy, type Copy } from '../i18n/dictionary';

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

// Text we wrote for the person using the app, so it is safe to show as is.
export class UserFacingError extends Error {
  name = 'UserFacingError';
}

const NETWORK_ERROR_NAMES = ['FunctionsFetchError', 'AuthRetryableFetchError'];

function errName(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'name' in err) return String((err as any).name);
  return undefined;
}

// No connection shows up as a fetch failure, an Edge Function fetch failure, or our own timeout.
function isNetworkError(err: unknown): boolean {
  if (NETWORK_ERROR_NAMES.includes(errName(err) ?? '')) return true;
  const msg = errMessage(err).toLowerCase();
  return msg.includes('network') || msg.includes('fetch failed') || msg.includes('failed to fetch') || msg.includes('failed to send a request');
}

function isUserFacing(err: unknown): boolean {
  return err instanceof UserFacingError || errName(err) === 'UserFacingError' || errName(err) === 'FunctionError';
}

// Supabase's English message text, mapped to our own wording in the chosen language.
const AUTH_MESSAGE_OVERRIDES: Record<string, keyof Copy['errorCopy']> = {
  'Invalid login credentials': 'invalidCredentials',
  'Token has expired or is invalid': 'otpExpired',
  'New password should be different': 'samePassword',
};

const AUTH_CODE_OVERRIDES: Record<string, keyof Copy['errorCopy']> = {
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  email_address_invalid: 'invalidEmail',
  weak_password: 'weakPassword',
  email_not_confirmed: 'emailNotConfirmed',
  same_password: 'samePassword',
};

// A wrong email or password, as opposed to a network or server problem; only these count toward the sign-in limit.
export function isInvalidCredentialsError(err: unknown): boolean {
  return errCode(err) === 'invalid_credentials' || errMessage(err).includes('Invalid login credentials');
}

// The server no longer has this device's session, e.g. after a password change elsewhere.
export function isSessionMissingError(err: unknown): boolean {
  return errCode(err) === 'session_not_found' || (err instanceof Error && err.name === 'AuthSessionMissingError');
}

// A wrong or expired email code, as opposed to a network or rate-limit failure.
export function isInvalidOtpError(err: unknown): boolean {
  return errCode(err) === 'otp_expired' || errMessage(err).includes('Token has expired or is invalid');
}

// The verified reset session is no longer usable, so a new code is needed.
export function isExpiredSessionError(err: unknown): boolean {
  const code = errCode(err);
  return isSessionMissingError(err) || code === 'session_expired' || code === 'bad_jwt';
}

// Inactive accounts are banned in Supabase Auth; email sign-in hits that ban directly, username sign-in gets it from the sign-in function.
export function isAccountDisabledError(err: unknown): boolean {
  const code = errCode(err);
  return code === 'user_banned' || code === 'account_deactivated' || errMessage(err).includes('User is banned');
}

function isRateLimitError(err: unknown): boolean {
  const status = err && typeof err === 'object' && 'status' in err ? (err as any).status : undefined;
  return status === 429 || errCode(err) === 'over_request_rate_limit';
}


export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const copy = getCopy().errorCopy;
  if (isNetworkError(err)) return copy.offline;
  if (isRateLimitError(err)) return copy.rateLimit;
  if (isSessionMissingError(err)) return copy.session;
  if (isAccountDisabledError(err)) return copy.disabled;
  const code = errCode(err);
  if (code && AUTH_CODE_OVERRIDES[code]) return copy[AUTH_CODE_OVERRIDES[code]];
  const msg = errMessage(err);
  for (const key of Object.keys(AUTH_MESSAGE_OVERRIDES)) {
    if (msg.includes(key)) return copy[AUTH_MESSAGE_OVERRIDES[key]];
  }
  // Anything else is library or server wording, which means little to a farmer.
  return isUserFacing(err) && msg ? msg : fallback;
}


export function getActionErrorMessage(err: unknown, fallback: string): string {
  const copy = getCopy().errorCopy;
  if (isNetworkError(err)) return copy.offline;
  if (isSessionMissingError(err)) return copy.session;
  if (errCode(err) === '42501') return copy.permission;
  return fallback;
}
