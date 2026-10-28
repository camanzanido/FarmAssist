const scratchAuth = {
  verifyOtp: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../src/database/supabase/scratchClient', () => ({
  createScratchClient: () => ({ auth: scratchAuth }),
}));
jest.mock('../../src/database/supabase/supabase', () => ({ supabase: { auth: {} } }));

import { isValidOtp } from '../../src/auth/otp';
import { setPasswordAfterReset, verifyResetCode } from '../../src/auth/passwordService';

beforeEach(() => {
  jest.clearAllMocks();
  scratchAuth.signOut.mockResolvedValue({ error: null });
});

describe('isValidOtp', () => {
  it('accepts exactly 8 digits', () => {
    expect(isValidOtp('12345678')).toBe(true);
    expect(isValidOtp(' 12345678 ')).toBe(true);
  });

  it('rejects other lengths and non-digits', () => {
    for (const code of ['', '123456', '1234567', '123456789', '1234567a', '1234 678']) {
      expect(isValidOtp(code)).toBe(false);
    }
  });
});

describe('password reset', () => {
  it('throws on a wrong code and never changes the password', async () => {
    scratchAuth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });

    await expect(verifyResetCode(' Juan@Example.com ', '12345678')).rejects.toMatchObject({ code: 'otp_expired' });
    expect(scratchAuth.verifyOtp).toHaveBeenCalledWith({ email: 'juan@example.com', token: '12345678', type: 'recovery' });
    expect(scratchAuth.updateUser).not.toHaveBeenCalled();
  });

  it('saves the password through the verified session, then signs out everywhere', async () => {
    scratchAuth.verifyOtp.mockResolvedValue({ error: null });
    scratchAuth.updateUser.mockResolvedValue({ error: null });

    const session = await verifyResetCode('juan@example.com', '12345678');
    expect(scratchAuth.updateUser).not.toHaveBeenCalled();

    await setPasswordAfterReset(session, 'new-password-1');
    expect(scratchAuth.updateUser).toHaveBeenCalledWith({ password: 'new-password-1' });
    expect(scratchAuth.signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('surfaces a failed password update without signing out', async () => {
    scratchAuth.verifyOtp.mockResolvedValue({ error: null });
    scratchAuth.updateUser.mockResolvedValue({ error: { code: 'session_expired', message: 'Session expired' } });

    const session = await verifyResetCode('juan@example.com', '12345678');
    await expect(setPasswordAfterReset(session, 'new-password-1')).rejects.toMatchObject({ code: 'session_expired' });
    expect(scratchAuth.signOut).not.toHaveBeenCalled();
  });
});
