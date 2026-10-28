import { createScratchClient } from '../database/supabase/scratchClient';
import { supabase } from '../database/supabase/supabase';
import { cleanEmail } from '../utils/profileValidation';
import { withTimeout } from '../utils/withTimeout';

export async function sendPasswordResetCode(email: string): Promise<void> {
  const { error } = await withTimeout(() => supabase.auth.resetPasswordForEmail(cleanEmail(email)));
  if (error) throw error;
}

export type ResetSession = ReturnType<typeof createScratchClient>;

// Runs on a scratch client, so the recovery session never reaches the app and the person signs in normally afterwards.
// The code is single-use, so the returned client carries the verified session to setPasswordAfterReset.
export async function verifyResetCode(email: string, code: string): Promise<ResetSession> {
  const scratch = createScratchClient();
  const { error } = await withTimeout(() =>
    scratch.auth.verifyOtp({ email: cleanEmail(email), token: code.trim(), type: 'recovery' })
  );
  if (error) throw error;
  return scratch;
}

export async function setPasswordAfterReset(scratch: ResetSession, newPassword: string): Promise<void> {
  const { error: updateError } = await withTimeout(() => scratch.auth.updateUser({ password: newPassword }));
  if (updateError) throw updateError;

  // Signs out every device, so anyone holding the old password loses access.
  await scratch.auth.signOut({ scope: 'global' }).catch((e) => console.warn('Sign-out after reset failed:', e));
}

// Checks the current password on a scratch client and changes it there; a fresh sign-in on a scratch client avoids Supabase's reauthentication rule.
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const scratch = createScratchClient();
  const { error: checkError } = await withTimeout(() =>
    scratch.auth.signInWithPassword({ email, password: currentPassword })
  );
  if (checkError) throw checkError;

  const { error: updateError } = await withTimeout(() => scratch.auth.updateUser({ password: newPassword }));
  if (updateError) throw updateError;

  await scratch.auth.signOut({ scope: 'local' }).catch((e) => console.warn('Scratch sign-out failed:', e));

  // Supabase ends every other session when a password changes, including the app's, so sign the app in again.
  const { error: resignError } = await withTimeout(() => supabase.auth.signInWithPassword({ email, password: newPassword }));
  if (resignError) throw resignError;
}
