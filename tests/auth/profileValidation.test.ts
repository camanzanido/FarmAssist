import { cleanName, emailChanged, NAME_MAX_LENGTH, validateEmail, validateName } from '../../src/utils/profileValidation';

describe('validateName', () => {
  it('accepts a normal name', () => {
    expect(validateName('Juan Dela Cruz')).toBeNull();
  });

  it('rejects an empty or blank name', () => {
    expect(validateName('')).not.toBeNull();
    expect(validateName('   ')).not.toBeNull();
  });

  it('rejects a name over the limit after trimming', () => {
    expect(validateName('a'.repeat(NAME_MAX_LENGTH))).toBeNull();
    expect(validateName('a'.repeat(NAME_MAX_LENGTH + 1))).not.toBeNull();
  });

  it('collapses inner spaces when cleaning', () => {
    expect(cleanName('  Juan   Dela  Cruz ')).toBe('Juan Dela Cruz');
  });
});

describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('juan@example.com')).toBeNull();
    expect(validateEmail('  Juan@Example.com ')).toBeNull();
  });

  it('rejects empty and malformed emails', () => {
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('juan')).not.toBeNull();
    expect(validateEmail('juan@example')).not.toBeNull();
    expect(validateEmail('juan @example.com')).not.toBeNull();
  });
});

describe('emailChanged', () => {
  it('ignores case and surrounding spaces', () => {
    expect(emailChanged('juan@example.com', ' JUAN@example.com ')).toBe(false);
  });

  it('detects a different address', () => {
    expect(emailChanged('juan@example.com', 'juan@farm.ph')).toBe(true);
  });
});
