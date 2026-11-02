import { getActionErrorMessage, getAuthErrorMessage, isAccountDisabledError, isInvalidCredentialsError, isSessionMissingError } from '../../src/utils/errors';

class AuthSessionMissingError extends Error {
  name = 'AuthSessionMissingError';
}

describe('session missing errors', () => {
  it('recognises the supabase-js error and the server code', () => {
    expect(isSessionMissingError(new AuthSessionMissingError('Auth session missing!'))).toBe(true);
    expect(isSessionMissingError({ code: 'session_not_found', message: 'Session not found' })).toBe(true);
    expect(isSessionMissingError(new Error('Invalid login credentials'))).toBe(false);
  });

  it('asks the person to sign in again instead of a generic failure', () => {
    const err = new AuthSessionMissingError('Auth session missing!');
    expect(getActionErrorMessage(err, 'fallback')).toMatch(/sign in again/);
    expect(getAuthErrorMessage(err, 'fallback')).toMatch(/sign in again/);
  });
});

describe('disabled account errors', () => {
  it('recognises the email sign-in ban and the sign-in function code', () => {
    expect(isAccountDisabledError({ code: 'user_banned', message: 'User is banned' })).toBe(true);
    expect(isAccountDisabledError({ code: 'account_deactivated', message: 'anything' })).toBe(true);
    expect(isAccountDisabledError(new Error('User is banned'))).toBe(true);
    expect(isAccountDisabledError({ code: 'invalid_credentials', message: 'Incorrect username or password.' })).toBe(false);
  });

  it('says the account is disabled and does not count as a wrong password', () => {
    const err = { code: 'user_banned', message: 'User is banned' };
    expect(getAuthErrorMessage(err, 'fallback')).toMatch(/disabled/);
    expect(isInvalidCredentialsError(err)).toBe(false);
  });
});
