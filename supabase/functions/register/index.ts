// Creates a farmer account that has no email, using a hidden address that can never receive mail.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_NAME_LENGTH = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  name?: unknown;
  username?: unknown;
  password?: unknown;
  city?: unknown;
  province?: unknown;
  accepted_terms_version?: unknown;
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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_input', 'The request was not valid.');
  }

  const name = text(body.name).replace(/\s+/g, ' ');
  const username = text(body.username).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const city = text(body.city);
  const province = text(body.province);
  // Old APKs never send this, so their accounts start without a recorded acceptance and are asked in the app.
  const termsVersion = text(body.accepted_terms_version).slice(0, 40);

  if (!name || !city || !province) return fail(400, 'invalid_input', 'Fill in every field.');
  if (name.length > MAX_NAME_LENGTH) return fail(400, 'invalid_input', `Keep your name under ${MAX_NAME_LENGTH} characters.`);
  if (!USERNAME_PATTERN.test(username)) {
    return fail(400, 'invalid_input', 'Use 3 to 30 letters, numbers, dots (.) or underscores (_) for the username.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, 'invalid_input', `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: available, error: availableError } = await admin.rpc('username_available', { p_username: username });
  if (availableError) {
    console.error('username check failed:', availableError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
  if (available !== true) return fail(409, 'username_taken', 'That username is already taken.');

  const email = `${username}@${INTERNAL_EMAIL_DOMAIN}`;

  // email_confirm skips the confirmation mail, which could never arrive at the hidden address.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username, user_type: 'farmer' },
  });
  if (createError || !created.user) {
    const exists = createError?.code === 'email_exists' || /already been registered/i.test(createError?.message ?? '');
    if (exists) return fail(409, 'username_taken', 'That username is already taken.');
    console.error('createUser failed:', createError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
  const id = created.user.id;

  const { error: profileError } = await admin.from('users').insert({
    id, name, username, email, status: 'active', user_type: 'farmer',
    ...(termsVersion ? { terms_accepted_at: new Date().toISOString(), terms_version: termsVersion } : {}),
  });
  const { error: locationError } = profileError
    ? { error: null }
    : await admin.from('locations').insert({ city, province, user_id: id });

  if (profileError || locationError) {
    console.error('profile setup failed, rolling back:', profileError ?? locationError);
    await admin.from('locations').delete().eq('user_id', id);
    await admin.from('users').delete().eq('id', id);
    await admin.auth.admin.deleteUser(id);
    const taken = profileError?.code === '23505';
    return taken
      ? fail(409, 'username_taken', 'That username is already taken.')
      : fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  return json({ id }, 201);
});
