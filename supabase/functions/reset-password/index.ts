// Lets an active researcher set a temporary password for someone who can't reset their own.
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MIN_PASSWORD_LENGTH = 6;

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
  if (isResearcher !== true) return fail(403, 'forbidden', 'Only active researchers can reset passwords.');

  const { data: callerUser } = await caller.auth.getUser();

  let body: { user_id?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid_input', 'The request was not valid.');
  }

  const userId = typeof body.user_id === 'string' ? body.user_id : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!userId) return fail(400, 'invalid_input', 'Choose an account.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, 'invalid_input', `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  // Researchers change their own password from Profile, which asks for the current one first.
  if (callerUser?.user?.id === userId) {
    return fail(400, 'own_account', 'Change your own password from Profile instead.');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    if (error.status === 404) return fail(404, 'not_found', 'That account no longer exists.');
    console.error('updateUserById failed:', error);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }

  return json({ ok: true }, 200);
});
