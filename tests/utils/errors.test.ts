import { getActionErrorMessage, getAuthErrorMessage, isSessionMissingError } from '../../src/utils/errors';

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
