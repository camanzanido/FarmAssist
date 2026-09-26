import { getActionErrorMessage } from '../../src/utils/errors';
import { TIMEOUT_MESSAGE, withTimeout } from '../../src/utils/withTimeout';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves with the request result when it finishes in time', async () => {
    await expect(withTimeout(async () => 'ok', 1000)).resolves.toBe('ok');
  });

  it('rejects and aborts the signal when the request hangs', async () => {
    let captured: AbortSignal | undefined;
    const pending = withTimeout((signal) => {
      captured = signal;
      return new Promise<never>(() => {}); // never settles, like a stalled token refresh
    }, 1000);

    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toThrow(TIMEOUT_MESSAGE);
    expect(captured?.aborted).toBe(true);
  });

  it('passes through request errors unchanged', async () => {
    const err = new Error('boom');
    await expect(withTimeout(() => Promise.reject(err), 1000)).rejects.toBe(err);
  });

  it('shows the offline message for a timeout', async () => {
    const pending = withTimeout(() => new Promise<never>(() => {}), 1000);
    jest.advanceTimersByTime(1000);
    const err = await pending.catch((e) => e);
    expect(getActionErrorMessage(err, 'fallback')).toBe('Check your internet connection and try again.');
  });
});
