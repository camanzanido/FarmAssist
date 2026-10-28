import { withTimeout } from '../../utils/withTimeout';
import { supabase } from './supabase';

// Carries an Edge Function's own message, which is already worded for the person using the app.
export class FunctionError extends Error {
  name = 'FunctionError';
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

// Edge functions can cold-start, so this allows longer than the usual remote timeout.
const FUNCTION_TIMEOUT_MS = 25_000;

export async function invokeFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await withTimeout(
    (signal) => supabase.functions.invoke<T>(name, { body, signal }),
    FUNCTION_TIMEOUT_MS
  );
  if (error) {
    const context = (error as { context?: Response }).context;
    let parsed: { error?: string; code?: string } | null = null;
    try {
      parsed = context && typeof context.json === 'function' ? await context.json() : null;
    } catch {
      parsed = null;
    }
    if (parsed?.error) throw new FunctionError(parsed.error, parsed.code, context?.status);
    throw error;
  }
  if (data == null) throw new Error(`${name} returned nothing`);
  return data;
}
