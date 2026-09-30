import { updateUserRemote } from '../database/repositories/researcher';
import { updateUser } from '../database/repositories/users';
import { supabase } from '../database/supabase/supabase';
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

export async function getPendingEmail(): Promise<string | null | undefined> {
  try {
    const { data, error } = await withTimeout(() => supabase.auth.getUser());
    if (error) return undefined;
    return data.user?.new_email ?? null;
  } catch {
    return undefined;
  }
}
