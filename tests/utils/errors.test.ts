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

class FunctionsFetchError extends Error {
  name = 'FunctionsFetchError';
}

describe('no internet', () => {
  const offline = /internet connection/;

  it('explains a failed Edge Function request as a connection problem', () => {
    const err = new FunctionsFetchError('Failed to send a request to the Edge Function');
    expect(getAuthErrorMessage(err, 'fallback')).toMatch(offline);
    expect(getActionErrorMessage(err, 'fallback')).toMatch(offline);
  });

  it('explains timeouts and React Native fetch failures the same way', () => {
    expect(getAuthErrorMessage(new Error('Network request timed out'), 'fallback')).toMatch(offline);
    expect(getAuthErrorMessage(new TypeError('Network request failed'), 'fallback')).toMatch(offline);
    expect(getAuthErrorMessage({ name: 'AuthRetryableFetchError', message: '' }, 'fallback')).toMatch(offline);
  });
});

describe('unknown errors', () => {
  it('shows the fallback instead of library text', () => {
    expect(getAuthErrorMessage(new Error('Edge Function returned a non-2xx status code'), 'Could not sign in.')).toBe('Could not sign in.');
    expect(getAuthErrorMessage({ message: 'relation "users" does not exist', code: '42P01' }, 'Could not sign in.')).toBe('Could not sign in.');
  });

  it('keeps messages our Edge Functions wrote for people', () => {
    const err = Object.assign(new Error('That username is already taken.'), { name: 'FunctionError', code: 'username_taken' });
    expect(getAuthErrorMessage(err, 'fallback')).toBe('That username is already taken.');
  });

  it('still maps known Supabase messages', () => {
    expect(getAuthErrorMessage(new Error('Invalid login credentials'), 'fallback')).toMatch(/Incorrect/);
  });
});

describe('Supabase Auth codes', () => {
  it('words common sign-up problems plainly', () => {
    expect(getAuthErrorMessage({ code: 'user_already_exists', message: 'User already registered' }, 'f')).toBe('An account with this email already exists. Sign in instead.');
    expect(getAuthErrorMessage({ code: 'email_address_invalid', message: 'Email address "x" is invalid' }, 'f')).toBe('That email address is not valid. Check it and try again.');
    expect(getAuthErrorMessage({ code: 'weak_password', message: 'Password should contain...' }, 'f')).toBe('That password is too easy to guess. Choose a longer one.');
  });

  it('keeps our own validation messages', () => {
    const { UserFacingError } = require('../../src/utils/errors');
    expect(getAuthErrorMessage(new UserFacingError('Enter your name.'), 'f')).toBe('Enter your name.');
  });
});
