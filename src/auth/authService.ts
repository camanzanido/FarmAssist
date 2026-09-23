// auth/authService.ts
import { SupabaseConnector } from '../database/powersync/connector';
import { db } from '../database/powersync/powersync';
import { claimLocalDecisions } from '../database/repositories/decisions';
import { createLocation, getAllLocations, getLocationsByUser } from '../database/repositories/locations';
import { createLocationRemote, fetchUserRemote, upsertUserRemote } from '../database/repositories/researcher';
import { upsertUser } from '../database/repositories/users';
import { supabase } from '../database/supabase/supabase';
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

async function claimIfEligible(userId: string, userType: string) {
  if (userType === 'researcher') return;

  const locations = await getLocationsByUser(userId);
  const locationId = locations[0]?.id ?? '';

  if (!locationId) {
    if (!(db.currentStatus?.hasSynced ?? false)) {
      console.log('Deferring decision claim until the first sync completes');
      return;
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
    return;
  }

  const claimed = await claimLocalDecisions(userId, locationId);
  if (claimed > 0) {
    console.log(`Claimed ${claimed} offline decision(s) for ${userId}`);
  }
}


const FIRST_SYNC_TIMEOUT_MS = 20_000;


function claimAfterFirstSync(userId: string, userType: string): void {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRST_SYNC_TIMEOUT_MS);

  void db
    .waitForFirstSync({ signal: controller.signal })
    .catch(() => undefined)
    .then(() => claimIfEligible(userId, userType))
    .catch((e) => console.warn('Deferred decision claim failed:', e))
    .finally(() => clearTimeout(timer));
}

// Connects PowerSync to Supabase so sync begins
export async function connectSync() {
  await disconnectSync();

  const connector = new SupabaseConnector(supabase);
  await db.connect(connector);
}

export async function disconnectSync() {
  await db.disconnect();
}

export async function signUp(params: {
  email: string;
  password: string;
  name: string;
  username: string;
  user_type: UserType;
  city: string;
  province: string;
}) {
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

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

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