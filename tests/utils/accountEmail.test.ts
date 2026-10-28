import {
  displayEmail,
  internalEmailFor,
  isEmailLogin,
  isInternalEmail,
  normalizeUsername,
  realEmail,
  validateUsername,
} from '../../src/utils/accountEmail';

describe('validateUsername', () => {
  it('accepts lowercase letters, numbers, dots and underscores', () => {
    expect(validateUsername('juan.dc_2')).toBeNull();
  });

  it('accepts mixed case because it is lowercased first', () => {
    expect(validateUsername('  Juan.DC ')).toBeNull();
  });

  it('rejects empty, short, long and spaced usernames', () => {
    expect(validateUsername('   ')).toMatch(/Enter/);
    expect(validateUsername('ab')).toMatch(/at least/);
    expect(validateUsername('a'.repeat(31))).toMatch(/under/);
    expect(validateUsername('juan dc')).toMatch(/only letters/);
    expect(validateUsername('juan@dc')).toMatch(/only letters/);
  });
});

describe('internal emails', () => {
  it('builds the hidden email from the normalized username', () => {
    expect(internalEmailFor(' Juan.DC ')).toBe('juan.dc@farmassist.invalid');
    expect(normalizeUsername(' Juan.DC ')).toBe('juan.dc');
  });

  it('recognizes hidden emails in any case', () => {
    expect(isInternalEmail('juan@FarmAssist.invalid')).toBe(true);
    expect(isInternalEmail('juan@gmail.com')).toBe(false);
    expect(isInternalEmail('')).toBe(false);
    expect(isInternalEmail(null)).toBe(false);
  });

  it('never shows a hidden email', () => {
    expect(displayEmail('juan@farmassist.invalid')).toBe('No email');
    expect(displayEmail('')).toBe('No email');
    expect(displayEmail('juan@gmail.com')).toBe('juan@gmail.com');
    expect(realEmail('juan@farmassist.invalid')).toBeNull();
  });
});

describe('isEmailLogin', () => {
  it('treats anything with an @ as an email', () => {
    expect(isEmailLogin('juan@gmail.com')).toBe(true);
    expect(isEmailLogin('juan.dc')).toBe(false);
  });
});
