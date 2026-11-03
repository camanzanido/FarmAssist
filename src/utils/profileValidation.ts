import { getCopy } from '../i18n/dictionary';

export const NAME_MAX_LENGTH = 60;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateName(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return getCopy().validationCopy.nameRequired;
  if (name.length > NAME_MAX_LENGTH) return getCopy().validationCopy.nameTooLong(NAME_MAX_LENGTH);
  return null;
}

export function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): string | null {
  const email = cleanEmail(raw);
  if (!email) return getCopy().validationCopy.emailRequired;
  if (!EMAIL_PATTERN.test(email)) return getCopy().validationCopy.emailInvalid;
  return null;
}

export function emailChanged(current: string, next: string): boolean {
  return cleanEmail(current) !== cleanEmail(next);
}
