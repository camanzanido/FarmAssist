import { validateNewUser, validateOptionalEmail, NewUserForm } from '../../src/utils/newUserValidation';

const VALID: NewUserForm = {
  name: 'Juan Dela Cruz',
  username: 'juan.dc',
  email: 'Juan@Example.com ',
  password: 'secret1',
  province: 'Laguna',
  city: 'Los Baños',
};

describe('validateNewUser', () => {
  it('accepts a complete form', () => {
    expect(validateNewUser(VALID)).toEqual({});
  });

  it('accepts a form without an email', () => {
    expect(validateNewUser({ ...VALID, email: '  ' })).toEqual({});
  });

  it('flags every missing required field', () => {
    const errors = validateNewUser({ name: ' ', username: '', email: '', password: '', province: '', city: '' });
    expect(Object.keys(errors).sort()).toEqual(['city', 'name', 'password', 'province', 'username']);
  });

  it('rejects a username with spaces, a malformed email, and a short password', () => {
    const errors = validateNewUser({ ...VALID, username: 'juan dc', email: 'juan@', password: '12345' });
    expect(errors.username).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('validateOptionalEmail', () => {
  it('rejects a hidden address typed in by hand', () => {
    expect(validateOptionalEmail('juan@farmassist.invalid')).not.toBeNull();
  });
});
