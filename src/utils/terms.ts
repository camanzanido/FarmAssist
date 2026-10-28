// Bump when the Terms & Privacy text changes in a way people must accept again.
export const TERMS_VERSION = '2026-10-27';

export type TermsAcceptance = { terms_accepted_at: string; terms_version: string };

export function needsTermsConsent(acceptedVersion: string | null | undefined): boolean {
  return acceptedVersion !== TERMS_VERSION;
}

export function termsAcceptance(now: Date = new Date()): TermsAcceptance {
  return { terms_accepted_at: now.toISOString(), terms_version: TERMS_VERSION };
}
