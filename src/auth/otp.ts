// Must match Supabase Auth's "Email OTP length" setting.
export const OTP_LENGTH = 8;

const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`);

export function isValidOtp(code: string): boolean {
  return OTP_PATTERN.test(code.trim());
}
