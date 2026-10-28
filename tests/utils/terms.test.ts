import { needsTermsConsent, TERMS_VERSION, termsAcceptance } from '../../src/utils/terms';

describe('needsTermsConsent', () => {
  it('asks accounts that never accepted or accepted an older version', () => {
    expect(needsTermsConsent(null)).toBe(true);
    expect(needsTermsConsent(undefined)).toBe(true);
    expect(needsTermsConsent('2000-01-01')).toBe(true);
  });

  it('does not ask again once the current version is accepted', () => {
    expect(needsTermsConsent(TERMS_VERSION)).toBe(false);
  });
});

describe('termsAcceptance', () => {
  it('stamps the current version and time', () => {
    const now = new Date('2026-10-27T01:02:03Z');
    expect(termsAcceptance(now)).toEqual({ terms_accepted_at: '2026-10-27T01:02:03.000Z', terms_version: TERMS_VERSION });
  });
});
