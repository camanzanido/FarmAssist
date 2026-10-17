// Signs in by username, so the account's email (real or hidden) never has to reach the app.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INTERNAL_EMAIL_DOMAIN = 'farmassist.invalid';
const WRONG_LOGIN = 'Incorrect username or password.';

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
      return fail(429, 'over_request_rate_limit', 'Too many sign-in attempts. Please wait a few minutes and try again.');
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

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }, 200);
});
