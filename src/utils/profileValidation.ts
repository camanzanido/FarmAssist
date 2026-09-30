export const NAME_MAX_LENGTH = 60;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateName(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return 'Enter your name.';
  if (name.length > NAME_MAX_LENGTH) return `Keep your name under ${NAME_MAX_LENGTH} characters.`;
  return null;
}

export function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): string | null {
  const email = cleanEmail(raw);
  if (!email) return 'Enter your email.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email, like juan@example.com.';
  return null;
}

export function emailChanged(current: string, next: string): boolean {
  return cleanEmail(current) !== cleanEmail(next);
}
