import { RegisterForm, validateRegister, validateRegisterStep } from '../../src/utils/registerValidation';

const VALID: RegisterForm = {
  name: 'Juan Dela Cruz',
  province: 'Laguna',
  city: 'Los Baños',
  username: 'juan.dc',
  email: '',
  password: 'secret1',
  confirmPassword: 'secret1',
  acceptedTerms: true,
};

describe('validateRegisterStep', () => {
  it('accepts a complete form on both steps', () => {
    expect(validateRegisterStep('about', VALID)).toEqual({});
    expect(validateRegisterStep('account', VALID)).toEqual({});
  });

  it('only checks name and location on the first step', () => {
    const errors = validateRegisterStep('about', { ...VALID, name: ' ', city: '', username: '', password: '' });
    expect(Object.keys(errors).sort()).toEqual(['city', 'name']);
  });

  it('only checks sign-in details on the second step', () => {
    const errors = validateRegisterStep('account', { ...VALID, name: '', username: 'a', confirmPassword: 'other1' });
    expect(Object.keys(errors).sort()).toEqual(['confirmPassword', 'username']);
  });

  it('allows a blank email but rejects a malformed one', () => {
    expect(validateRegisterStep('account', { ...VALID, email: '' }).email).toBeUndefined();
    expect(validateRegisterStep('account', { ...VALID, email: 'juan@' }).email).toBeDefined();
  });
});

describe('terms agreement', () => {
  it('is required on the account step only', () => {
    const form = { ...VALID, acceptedTerms: false };
    expect(validateRegisterStep('about', form)).toEqual({});
    expect(validateRegisterStep('account', form).acceptedTerms).toBeDefined();
  });
});

describe('validateRegister', () => {
  it('combines both steps', () => {
    const errors = validateRegister({ ...VALID, province: '', password: '' });
    expect(errors.province).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
