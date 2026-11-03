import { getCopy } from '../i18n/dictionary';

// Accounts without an email get a hidden one on this reserved domain, which can never receive mail.
export const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!username) return getCopy().validationCopy.usernameRequired;
  if (username.length < USERNAME_MIN_LENGTH) return getCopy().validationCopy.usernameTooShort(USERNAME_MIN_LENGTH);
  if (username.length > USERNAME_MAX_LENGTH) return getCopy().validationCopy.usernameTooLong(USERNAME_MAX_LENGTH);
  if (!USERNAME_PATTERN.test(username)) return getCopy().validationCopy.usernameInvalid;
  return null;
}

export function internalEmailFor(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

// The email to show a person, or null when the account has no real one.
export function realEmail(email: string | null | undefined): string | null {
  if (!email || isInternalEmail(email)) return null;
  return email;
}

export function displayEmail(email: string | null | undefined): string {
  return realEmail(email) ?? getCopy().commonCopy.noEmail;
}

// Login accepts either; anything with an @ is treated as an email.
export function isEmailLogin(login: string): boolean {
  return login.includes('@');
}
