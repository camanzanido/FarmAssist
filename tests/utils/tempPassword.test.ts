import { generateTempPassword } from '../../src/utils/tempPassword';

describe('generateTempPassword', () => {
  it('makes an 8-character password without look-alike characters', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTempPassword();
      expect(password).toHaveLength(8);
      expect(password).toMatch(/^[a-hjkmnp-z2-9]+$/);
    }
  });

  it('differs between calls', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
