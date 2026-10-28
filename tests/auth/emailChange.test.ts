const auth = {
  verifyOtp: jest.fn(),
  getUser: jest.fn(),
};

jest.mock('../../src/database/supabase/supabase', () => ({ supabase: { auth } }));
jest.mock('../../src/database/repositories/researcher', () => ({ updateUserRemote: jest.fn() }));
jest.mock('../../src/database/repositories/users', () => ({ updateUser: jest.fn() }));
jest.mock('../../src/database/supabase/invokeFunction', () => ({ invokeFunction: jest.fn() }));

import { verifyEmailChange } from '../../src/auth/profileService';
import { profileCopy } from '../../src/constants/copy';

beforeEach(() => jest.clearAllMocks());

describe('verifyEmailChange', () => {
  it('checks the code against the new address', async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email: 'new@example.com', new_email: null } }, error: null });

    await expect(verifyEmailChange(' New@Example.com ', '12345678')).resolves.toBeUndefined();
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'new@example.com', token: '12345678', type: 'email_change' });
  });

  it('passes a wrong or expired code through as an error', async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });

    await expect(verifyEmailChange('new@example.com', '12345678')).rejects.toMatchObject({ code: 'otp_expired' });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('does not report success while Auth still waits on the current address', async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email: 'old@example.com', new_email: 'new@example.com' } }, error: null });

    await expect(verifyEmailChange('new@example.com', '12345678')).rejects.toThrow(profileCopy.codeNeedsCurrent);
  });
});
