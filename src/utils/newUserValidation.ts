import { cleanEmail, cleanName, NAME_MAX_LENGTH } from './profileValidation';

export const TEMP_PASSWORD_MIN_LENGTH = 6;

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

  if (!form.username.trim()) errors.username = 'Enter a username.';
  else if (/\s/.test(form.username.trim())) errors.username = 'Usernames cannot have spaces.';

  const email = cleanEmail(form.email);
  if (!email) errors.email = 'Enter their email.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email, like juan@example.com.';

  if (form.password.length < TEMP_PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${TEMP_PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!form.province.trim()) errors.province = 'Choose a province.';
  if (!form.city.trim()) errors.city = 'Choose a city or municipality.';
  return errors;
}
