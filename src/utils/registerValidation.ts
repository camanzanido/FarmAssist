import { validateUsername } from './accountEmail';
import { validateOptionalEmail } from './newUserValidation';
import { validatePassword, validatePasswordConfirm } from './passwordValidation';

export type RegisterForm = {
  name: string;
  province: string;
  city: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type RegisterField = keyof RegisterForm;
export type RegisterTextField = Exclude<RegisterField, 'acceptedTerms'>;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export const REGISTER_STEPS = ['about', 'account'] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

export function validateRegisterStep(step: RegisterStep, form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {};
  if (step === 'about') {
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.province.trim()) errors.province = 'Province is required';
    if (!form.city.trim()) errors.city = 'City/municipality is required';
    return errors;
  }
  const usernameError = validateUsername(form.username);
  if (usernameError) errors.username = usernameError;
  const emailError = validateOptionalEmail(form.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(form.password);
  if (passwordError) errors.password = passwordError;
  const confirmError = validatePasswordConfirm(form.password, form.confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;
  if (!form.acceptedTerms) errors.acceptedTerms = 'Please agree to the Terms & Privacy to create an account.';
  return errors;
}

export function validateRegister(form: RegisterForm): RegisterErrors {
  return { ...validateRegisterStep('about', form), ...validateRegisterStep('account', form) };
}
