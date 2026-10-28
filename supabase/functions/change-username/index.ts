// Lets a signed-in user pick a new username; a no-email account's hidden sign-in email is renamed with it.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';
const TAKEN = 'That username is already taken.';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function fail(status: number, code: string, error: string): Response {
  return json({ code, error }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return fail(401, 'unauthorized', 'Please sign in again.');

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  const authUser = callerData?.user;
  if (callerError || !authUser) return fail(401, 'unauthorized', 'Please sign in again.');

  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_input', 'The request was not valid.');
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username)) {
    return fail(400, 'invalid_input', 'Use 3 to 30 letters, numbers, dots (.) or underscores (_) for the username.');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: current, error: currentError } = await admin.from('users').select('username').eq('id', authUser.id).maybeSingle();
  if (currentError) {
    console.error('profile lookup failed:', currentError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
  if (!current) return fail(409, 'profile_not_synced', 'Your account is still syncing. Try again in a minute.');
  if (current.username.toLowerCase() === username) return json({ ok: true, username }, 200);

  // The unique lower(username) index settles races between two people choosing the same name.
  const { error: updateError } = await admin.from('users').update({ username }).eq('id', authUser.id);
  if (updateError) {
    if (updateError.code === '23505') return fail(409, 'username_taken', TAKEN);
    console.error('username update failed:', updateError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  // A hidden email left on the old name would block anyone who registers that name later.
  const hasHiddenEmail = (authUser.email ?? '').toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
  const { error: authError } = await admin.auth.admin.updateUserById(authUser.id, {
    ...(hasHiddenEmail ? { email: `${username}@${INTERNAL_EMAIL_DOMAIN}`, email_confirm: true } : {}),
    user_metadata: { ...authUser.user_metadata, username },
  });
  if (authError) {
    await admin.from('users').update({ username: current.username }).eq('id', authUser.id);
    const exists = authError.code === 'email_exists' || /already been registered/i.test(authError.message ?? '');
    if (exists) return fail(409, 'username_taken', TAKEN);
    console.error('auth update failed:', authError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  return json({ ok: true, username }, 200);
});
