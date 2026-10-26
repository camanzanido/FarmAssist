// Signs in by username, so the account's email (real or hidden) never has to reach the app.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';
const WRONG_LOGIN = 'Incorrect username or password.';
const TOO_MANY = 'Too many sign-in attempts. Please wait a few minutes and try again.';

// Supabase Auth sees every call from this function as one IP, so the per-user and per-device limits live here.
const RATE_WINDOW_S = 15 * 60;
const MAX_PER_USERNAME = 10;
const MAX_PER_IP = 30;

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

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_input', 'The request was not valid.');
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) return fail(400, 'invalid_credentials', WRONG_LOGIN);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userKey = `user:${username}`;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const checks = [admin.rpc('check_sign_in_rate', { p_key: userKey, p_max: MAX_PER_USERNAME, p_window_seconds: RATE_WINDOW_S })];
  if (ip) checks.push(admin.rpc('check_sign_in_rate', { p_key: `ip:${ip}`, p_max: MAX_PER_IP, p_window_seconds: RATE_WINDOW_S }));
  const results = await Promise.all(checks);
  const rateError = results.find(r => r.error)?.error;
  // A broken limiter shouldn't lock everyone out; Supabase Auth's own limit still applies behind it.
  if (rateError) console.error('rate check failed:', rateError);
  else if (results.some(r => r.data === false)) return fail(429, 'over_request_rate_limit', TOO_MANY);

  const { data: storedEmail, error: lookupError } = await admin.rpc('login_email_for_username', { p_username: username });
  if (lookupError) {
    console.error('username lookup failed:', lookupError);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  // A farmer who registered moments ago may not have their profile uploaded yet, so fall back to the hidden email.
  const email = typeof storedEmail === 'string' && storedEmail ? storedEmail : `${username}@${INTERNAL_EMAIL_DOMAIN}`;

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    if (error?.status === 429) {
      return fail(429, 'over_request_rate_limit', TOO_MANY);
    }
    if (error?.code === 'email_not_confirmed') {
      return fail(400, 'email_not_confirmed', 'Open the confirmation link we emailed you, then sign in.');
    }
    // An unknown username and a wrong password get the same answer, so usernames can't be probed.
    if (!error || error.code === 'invalid_credentials' || error.status === 400) {
      return fail(400, 'invalid_credentials', WRONG_LOGIN);
    }
    console.error('signInWithPassword failed:', error);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  const { error: clearError } = await admin.rpc('clear_sign_in_rate', { p_key: userKey });
  if (clearError) console.error('rate clear failed:', clearError);

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }, 200);
});
