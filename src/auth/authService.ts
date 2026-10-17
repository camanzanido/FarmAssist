// auth/authService.ts
import { SupabaseConnector } from '../database/powersync/connector';
import { db } from '../database/powersync/powersync';
import { claimLocalDecisions, countAnonymousStagedDecisions, type ClaimScope } from '../database/repositories/decisions';
import { createLocation, getAllLocations, getLocationsByUser } from '../database/repositories/locations';
import { createLocationRemote, fetchUserRemote, upsertUserRemote } from '../database/repositories/researcher';
import { upsertUser } from '../database/repositories/users';
import { FunctionError, invokeFunction } from '../database/supabase/invokeFunction';
import { supabase } from '../database/supabase/supabase';
import { isEmailLogin, normalizeUsername } from '../utils/accountEmail';
import { withTimeout } from '../utils/withTimeout';
import { UserType } from './types';


async function resolveUserType(authUser: {
  id: string;
  user_metadata?: { user_type?: string };
}): Promise<string> {
  const local = await db.getOptional<{ user_type: string }>(
    'SELECT user_type FROM users WHERE id = ?',
    [authUser.id]
  );
  if (local) return local.user_type;


  try {
    const remote = await fetchUserRemote(authUser.id);
    if (remote) return remote.user_type;
  } catch (e) {
    console.warn('Could not resolve role from server:', e);
  }

  return authUser.user_metadata?.user_type ?? 'farmer';
}

async function claimIfEligible(
  userId: string,
  userType: string,
  scope: ClaimScope = 'own'
): Promise<number> {
  if (userType === 'researcher') return 0;

  const locations = await getLocationsByUser(userId);
  const locationId = locations[0]?.id ?? '';

  if (!locationId) {
    if (!(db.currentStatus?.hasSynced ?? false)) {
      console.log('Deferring decision claim until the first sync completes');
      return 0;
    }

    const [allLocal, localUserRow] = await Promise.all([
      getAllLocations(),
      db.getOptional<{ id: string }>('SELECT id FROM users WHERE id = ?', [userId]),
    ]);
    console.warn('Decision claim skipped: synced, but this user has no location', {
      userId,
      locationsInLocalDb: allLocal.length,
      locationUserIds: allLocal.map((l) => l.user_id),
      userRowSynced: !!localUserRow,
      connected: db.currentStatus?.connected ?? false,
      lastSyncedAt: db.currentStatus?.lastSyncedAt ?? null,
    });
    return 0;
  }

  const claimed = await claimLocalDecisions(userId, locationId, scope);
  if (claimed > 0) {
    console.log(`Claimed ${claimed} offline decision(s) for ${userId} (${scope})`);
  }
  return claimed;
}


const FIRST_SYNC_TIMEOUT_MS = 20_000;


async function waitForFirstSyncBounded(): Promise<void> {
  if (db.currentStatus?.hasSynced) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRST_SYNC_TIMEOUT_MS);
  try {
    await db.waitForFirstSync({ signal: controller.signal });
  } catch {
    return;
  } finally {
    clearTimeout(timer);
  }
}

export async function claimAnonymousDecisions(
  userId: string
): Promise<{ claimed: number; remaining: number }> {
  await waitForFirstSyncBounded();
  const claimed = await claimIfEligible(userId, 'farmer', 'own-and-anonymous');
  const remaining = await countAnonymousStagedDecisions();
  return { claimed, remaining };
}

function claimAfterFirstSync(userId: string, userType: string): void {
  void waitForFirstSyncBounded()
    .then(() => claimIfEligible(userId, userType))
    .catch((e) => console.warn('Deferred decision claim failed:', e));
}

const SYNC_RETRY_DELAY_MS = 15_000;

// Connects PowerSync to Supabase so sync begins
export async function connectSync() {
  await disconnectSync();

  const connector = new SupabaseConnector(supabase);
  await db.connect(connector, { retryDelayMs: SYNC_RETRY_DELAY_MS });
}

export async function disconnectSync() {
  await db.disconnect();
}

export type SignUpParams = {
  email: string;
  password: string;
  name: string;
  username: string;
  user_type: UserType;
  city: string;
  province: string;
};

// Without an email the server creates the account under a hidden address, then the farmer signs in by username.
async function signUpWithoutEmail(params: SignUpParams) {
  await invokeFunction<{ id: string }>('register', {
    name: params.name,
    username: params.username,
    password: params.password,
    city: params.city,
    province: params.province,
  });
  return signIn(params.username, params.password);
}

async function assertUsernameAvailable(username: string): Promise<void> {
  const { data, error } = await withTimeout((signal) =>
    supabase.rpc('username_available', { p_username: username }).abortSignal(signal)
  );
  if (error) throw error;
  if (data !== true) throw new FunctionError('That username is already taken.', 'username_taken');
}

export async function signUp(input: SignUpParams) {
  const params = { ...input, username: normalizeUsername(input.username), email: input.email.trim() };
  if (!params.email) return signUpWithoutEmail(params);

  // A taken username would otherwise only fail later, when PowerSync uploads the profile.
  await assertUsernameAvailable(params.username);

  // Create auth account in Supabase
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        // Store role in auth metadata so PowerSync RLS can read it
        user_type: params.user_type,
        name: params.name,
        username: params.username,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed — no user returned');

  console.log("Successfully created auth account.");

  const profile = {
    id: data.user.id,
    name: params.name,
    username: params.username,
    email: params.email,
    status: 'active',
    user_type: params.user_type,
  };

  if (params.user_type === 'researcher') {
    // Researchers work online-only and never connect to PowerSync, so write
    // straight to Supabase instead of queuing through the local store.
    await upsertUserRemote(profile);
    await createLocationRemote({ city: params.city, province: params.province, user_id: data.user.id });
  } else {
    // Write profile to local DB immediately (works offline after this)
    await upsertUser(profile);
    await createLocation({ city: params.city, province: params.province, user_id: data.user.id });
  }

  // Claim any decisions made locally before this account existed
  await claimIfEligible(data.user.id, params.user_type);

  // Start syncing if session was returned (email confirmation off) — skip for
  // researchers, who work online-only and don't use the local PowerSync mirror
  if (data.session && params.user_type !== 'researcher') {
    await connectSync();
  }

  return data;
}

// The sign-in function looks the email up server-side, so the app never learns another person's email.
async function signInWithUsername(username: string, password: string) {
  const tokens = await invokeFunction<{ access_token: string; refresh_token: string }>('sign-in', {
    username: normalizeUsername(username),
    password,
  });
  return supabase.auth.setSession(tokens);
}

export async function signIn(login: string, password: string) {
  const trimmed = login.trim();
  const { data, error } = isEmailLogin(trimmed)
    ? await supabase.auth.signInWithPassword({ email: trimmed, password })
    : await signInWithUsername(trimmed, password);

  if (error) throw error;
  if (!data.user || !data.session) throw new Error('Sign in failed');

  // Pull user profile from local DB (may already exist from prior session)
  const existingProfile = await db.getOptional<{ id: string; user_type: string }>(
    'SELECT id, user_type FROM users WHERE id = ?',
    [data.user.id]
  );



  let userType: string = existingProfile?.user_type ?? 'farmer';
  if (!existingProfile) {
    let remoteProfile: Awaited<ReturnType<typeof fetchUserRemote>> = null;
    let remoteLookupFailed = false;
    try {
      remoteProfile = await fetchUserRemote(data.user.id);
    } catch (e) {

      remoteLookupFailed = true;
      console.warn('Could not check remote profile on sign-in:', e);
    }

    const meta = data.user.user_metadata;
    if (remoteProfile) {
      userType = remoteProfile.user_type;
    } else {
      userType = meta.user_type ?? 'farmer';
      if (!remoteLookupFailed) {
        const profile = {
          id: data.user.id,
          name: meta.name ?? '',
          username: meta.username ?? '',
          email: data.user.email ?? '',
          status: 'active',
          user_type: userType,
        };
        if (userType === 'researcher') {
          await upsertUserRemote(profile);
        } else {
          await upsertUser(profile);
        }
      }
    }
  }

  // Claim any decisions made locally before this sign-in
  await claimIfEligible(data.user.id, userType);

  // Start syncing — PowerSync will pull all rows the user has RLS access to.
  if (userType !== 'researcher') {
    await connectSync();
    claimAfterFirstSync(data.user.id, userType);
  }

  return data;
}

export async function signOut() {

  await db.disconnectAndClear({ clearLocal: false });
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function restoreSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();

  if (!data.session) return false; // offline-only mode


  const userType = await resolveUserType(data.session.user);
  if (userType !== 'researcher') {
    await connectSync();

    await claimIfEligible(data.session.user.id, userType).catch((e) =>
      console.warn('Decision claim retry failed:', e)
    );

    claimAfterFirstSync(data.session.user.id, userType);
  }

  return true; // authenticated (farmers: online + syncing)
}