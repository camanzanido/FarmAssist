import { validateNewUser, NewUserForm } from '../../src/utils/newUserValidation';

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

  it('flags every missing field', () => {
    const errors = validateNewUser({ name: ' ', username: '', email: '', password: '', province: '', city: '' });
    expect(Object.keys(errors).sort()).toEqual(['city', 'email', 'name', 'password', 'province', 'username']);
  });

  it('rejects a username with spaces, a malformed email, and a short password', () => {
    const errors = validateNewUser({ ...VALID, username: 'juan dc', email: 'juan@', password: '12345' });
    expect(errors.username).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
