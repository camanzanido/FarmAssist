import { validatePassword, validatePasswordConfirm } from '../../src/utils/passwordValidation';

describe('validatePassword', () => {
  it('needs at least 6 characters', () => {
    expect(validatePassword('')).toMatch(/Enter/);
    expect(validatePassword('12345')).toMatch(/at least 6/);
    expect(validatePassword('123456')).toBeNull();
  });
});

describe('validatePasswordConfirm', () => {
  it('needs the same password typed twice', () => {
    expect(validatePasswordConfirm('secret1', '')).toMatch(/again/);
    expect(validatePasswordConfirm('secret1', 'secret2')).toMatch(/match/);
    expect(validatePasswordConfirm('secret1', 'secret1')).toBeNull();
  });
});
