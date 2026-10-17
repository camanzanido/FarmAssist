import { INTERNAL_EMAIL_DOMAIN, validateUsername } from './accountEmail';
import { PASSWORD_MIN_LENGTH } from './passwordValidation';
import { cleanEmail, cleanName, NAME_MAX_LENGTH } from './profileValidation';

export const TEMP_PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NewUserForm {
  name: string;
  username: string;
  email: string;
  password: string;
  province: string;
  city: string;
}

export type NewUserErrors = Partial<Record<keyof NewUserForm, string>>;

// Mirrors the create-user function's checks so most mistakes are caught before a network round trip.
export function validateNewUser(form: NewUserForm): NewUserErrors {
  const errors: NewUserErrors = {};
  const name = cleanName(form.name);
  if (!name) errors.name = 'Enter their name.';
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Keep the name under ${NAME_MAX_LENGTH} characters.`;

  const usernameError = validateUsername(form.username);
  if (usernameError) errors.username = usernameError;

  const emailError = validateOptionalEmail(form.email);
  if (emailError) errors.email = emailError;

  if (form.password.length < TEMP_PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${TEMP_PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!form.province.trim()) errors.province = 'Choose a province.';
  if (!form.city.trim()) errors.city = 'Choose a city or municipality.';
  return errors;
}

// Email is optional, but if one is typed it must be a real address.
export function validateOptionalEmail(raw: string): string | null {
  const email = cleanEmail(raw);
  if (!email) return null;
  if (!EMAIL_PATTERN.test(email) || email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) {
    return 'Enter a valid email, like juan@example.com.';
  }
  return null;
}
