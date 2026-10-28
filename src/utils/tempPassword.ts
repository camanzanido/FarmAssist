// No 0/O or 1/l/I, so a farmer copying it from a researcher's screen can't mix them up.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export const TEMP_PASSWORD_LENGTH = 8;

export function generateTempPassword(length = TEMP_PASSWORD_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
