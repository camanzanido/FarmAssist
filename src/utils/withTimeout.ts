export const REMOTE_TIMEOUT_MS = 10_000;

export const TIMEOUT_MESSAGE = 'Network request timed out';


export function withTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  ms: number = REMOTE_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(TIMEOUT_MESSAGE));
    }, ms);
  });
  return Promise.race([Promise.resolve(request(controller.signal)), timeout]).finally(() =>
    clearTimeout(timer)
  );
}
