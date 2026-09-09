// auth/authService.ts
import { SupabaseConnector } from '../database/powersync/connector';
import { db } from '../database/powersync/powersync';
import { claimLocalDecisions } from '../database/repositories/decisions';
import { createLocation, getLocationsByUser } from '../database/repositories/locations';
import { createLocationRemote, upsertUserRemote } from '../database/repositories/researcher';
import { upsertUser } from '../database/repositories/users';
import { supabase } from '../database/supabase/supabase';
import { UserType } from './types';

async function claimIfEligible(userId: string, userType: string) {
  if (userType === 'researcher') return;
  const locations = await getLocationsByUser(userId);
  await claimLocalDecisions(userId, locations[0]?.id ?? '');
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

  // If no local profile (first time on this device), write from auth metadata
  let userType: string = existingProfile?.user_type ?? 'farmer';
  if (!existingProfile) {
    const meta = data.user.user_metadata;
    userType = meta.user_type ?? 'farmer';
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

  // Claim any decisions made locally before this sign-in
  await claimIfEligible(data.user.id, userType);

  // Start syncing — PowerSync will pull all rows the user has RLS access to.
  // Researchers work online-only and never connect to PowerSync.
  if (userType !== 'researcher') {
    await connectSync();
  }

  return data;
}

export async function signOut() {
  // Stop sync first, then sign out
  await disconnectSync();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function restoreSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();

  if (!data.session) return false; // offline-only mode

  // Researchers work online-only and never connect to PowerSync — their
  // role is available directly from auth metadata, no local lookup needed.
  const userType = data.session.user.user_metadata?.user_type;
  if (userType !== 'researcher') {
    await connectSync();
  }

  return true; // authenticated (farmers: online + syncing)
}