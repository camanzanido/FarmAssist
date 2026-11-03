import { getCopy } from '../i18n/dictionary';

// Supabase's own minimum; the Edge Functions check the same number.
export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(password: string): string | null {
  if (!password) return getCopy().validationCopy.passwordRequired;
  if (password.length < PASSWORD_MIN_LENGTH) return getCopy().validationCopy.passwordTooShort(PASSWORD_MIN_LENGTH);
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return getCopy().validationCopy.confirmRequired;
  if (password !== confirm) return getCopy().validationCopy.passwordMismatch;
  return null;
}
