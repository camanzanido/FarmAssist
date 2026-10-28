import { updateUserRemote } from '../database/repositories/researcher';
import { updateUser } from '../database/repositories/users';
import { invokeFunction } from '../database/supabase/invokeFunction';
import { supabase } from '../database/supabase/supabase';
import { normalizeUsername, validateUsername } from '../utils/accountEmail';
import { cleanEmail, cleanName, validateEmail, validateName } from '../utils/profileValidation';
import { withTimeout } from '../utils/withTimeout';
import type { AuthUser } from './types';

export async function saveName(user: AuthUser, raw: string): Promise<void> {
  const error = validateName(raw);
  if (error) throw new Error(error);
  const name = cleanName(raw);
  if (user.user_type === 'researcher') {
    await updateUserRemote(user.id, { name });
  } else {
    await updateUser(user.id, { name });
  }
}

export async function requestEmailChange(raw: string): Promise<string | null> {
  const error = validateEmail(raw);
  if (error) throw new Error(error);
  const { data, error: authError } = await withTimeout(() => supabase.auth.updateUser({ email: cleanEmail(raw) }));
  if (authError) throw authError;
  return data.user?.new_email ?? null;
}

// The code goes to the new address only, so a hidden no-email address never has to confirm anything.
export async function verifyEmailChange(rawEmail: string, code: string): Promise<void> {
  const { error } = await withTimeout(() =>
    supabase.auth.verifyOtp({ email: cleanEmail(rawEmail), token: code.trim(), type: 'email_change' })
  );
  if (error) throw error;
}

export async function changeUsername(raw: string): Promise<string> {
  const error = validateUsername(raw);
  if (error) throw new Error(error);
  const { username } = await invokeFunction<{ ok: boolean; username: string }>('change-username', { username: normalizeUsername(raw) });
  // The hidden sign-in email was renamed server-side; refresh so the session's copy matches.
  await withTimeout(() => supabase.auth.refreshSession()).catch((e) => console.warn('Session refresh after username change failed:', e));
  return username;
}

export async function getPendingEmail(): Promise<string | null | undefined> {
  try {
    const { data, error } = await withTimeout(() => supabase.auth.getUser());
    if (error) return undefined;
    return data.user?.new_email ?? null;
  } catch {
    return undefined;
  }
}
