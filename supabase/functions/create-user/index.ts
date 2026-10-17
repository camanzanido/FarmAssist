// Lets an active researcher create a ready-to-use account; the service role key never leaves this function.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';
const MIN_PASSWORD_LENGTH = 6;
const USER_TYPES = ['farmer', 'researcher'];

type Body = {
  name?: unknown;
  username?: unknown;
  email?: unknown;
  password?: unknown;
  user_type?: unknown;
  city?: unknown;
  province?: unknown;
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function fail(status: number, code: string, error: string): Response {
  return json({ code, error }, status);
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return fail(401, 'unauthorized', 'Please sign in again.');

  // is_researcher() reads auth.uid(), so it must run as the caller, not as the service role.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: isResearcher, error: roleError } = await caller.rpc('is_researcher');
  if (roleError) {
    console.error('is_researcher failed:', roleError);
    return fail(401, 'unauthorized', 'Please sign in again.');
  }
  if (isResearcher !== true) return fail(403, 'forbidden', 'Only active researchers can create accounts.');

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_input', 'The request was not valid.');
  }

  const name = text(body.name);
  const username = text(body.username).toLowerCase();
  const givenEmail = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const userType = text(body.user_type);
  const city = text(body.city);
  const province = text(body.province);

  if (!name || !username || !city || !province) return fail(400, 'invalid_input', 'Fill in every field.');
  if (!USERNAME_PATTERN.test(username)) {
    return fail(400, 'invalid_input', 'Use 3 to 30 letters, numbers, dots (.) or underscores (_) for the username.');
  }
  if (givenEmail && !EMAIL_REGEX.test(givenEmail)) return fail(400, 'invalid_input', 'Enter a valid email address.');
  if (givenEmail.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) return fail(400, 'invalid_input', 'Enter a valid email address.');
  // Without an email the account gets a hidden one; only a researcher can then reset its password.
  const email = givenEmail || `${username}@${INTERNAL_EMAIL_DOMAIN}`;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, 'invalid_input', `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!USER_TYPES.includes(userType)) return fail(400, 'invalid_input', 'Choose Farmer or Researcher.');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: available, error: availableError } = await admin.rpc('username_available', { p_username: username });
  if (availableError) {
    console.error('username check failed:', availableError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
  if (available !== true) return fail(409, 'username_taken', 'That username is already taken.');

  // user_type in metadata mirrors the app's own sign-up, which PowerSync and RLS read.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username, user_type: userType },
  });
  if (createError || !created.user) {
    const exists = createError?.code === 'email_exists' || /already been registered/i.test(createError?.message ?? '');
    if (exists && !givenEmail) return fail(409, 'username_taken', 'That username is already taken.');
    if (exists) return fail(409, 'email_exists', 'An account with this email already exists.');
    console.error('createUser failed:', createError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
  const id = created.user.id;

  // With the service role auth.uid() is null, so the role guard trigger keeps status 'active'.
  const { error: profileError } = await admin.from('users').insert({
    id, name, username, email, status: 'active', user_type: userType,
  });
  const { error: locationError } = profileError
    ? { error: null }
    : await admin.from('locations').insert({ city, province, user_id: id });

  if (profileError || locationError) {
    console.error('profile setup failed, rolling back:', profileError ?? locationError);
    await admin.from('locations').delete().eq('user_id', id);
    await admin.from('users').delete().eq('id', id);
    await admin.auth.admin.deleteUser(id);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  return json({ id }, 201);
});
