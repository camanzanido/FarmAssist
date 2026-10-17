// Supabase's own minimum; the Edge Functions check the same number.
export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Type the password again.';
  if (password !== confirm) return 'The passwords do not match.';
  return null;
}
