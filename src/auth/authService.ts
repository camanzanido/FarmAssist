// auth/authService.ts
import { SupabaseConnector } from '../database/powersync/connector';
import { db } from '../database/powersync/powersync';
import { createLocation } from '../database/repositories/locations';
import { upsertUser } from '../database/repositories/users';
import { supabase } from '../database/supabase/supabase';
import { UserType } from './types';

// Connects PowerSync to Supabase so sync begins
export async function connectSync() {
  // Tear down any existing connection first — otherwise switching identities
  // (e.g. a restored session from a previous user still connected at boot,
  // followed by a fresh signIn/signUp) can leave PowerSync uploading local
  // rows under the wrong user's credentials, which Supabase RLS then rejects.
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
  // 1. Create auth account in Supabase
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
  // 2. Write profile to local DB immediately (works offline after this)
  await upsertUser({
    id: data.user.id,
    name: params.name,
    username: params.username,
    email: params.email,
    status: 'active',
    user_type: params.user_type,
  });

  console.log("Successfully insert auth account locally.")

  // 2b. Write the user's location — captured once at registration so it
  // doesn't need to be re-entered on every decision (RCDA already asks for
  // enough manual input). Decisions created offline before this account
  // existed have no location yet; that gets claimed once decision
  // persistence is built.
  await createLocation({
    city: params.city,
    province: params.province,
    user_id: data.user.id,
  });

  // 3. Start syncing if session was returned (email confirmation off)
  if (data.session) {
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
  const existingProfile = await db.getOptional<{ id: string }>(
    'SELECT id FROM users WHERE id = ?',
    [data.user.id]
  );

  // If no local profile (first time on this device), write from auth metadata
  if (!existingProfile) {
    const meta = data.user.user_metadata;
    await upsertUser({
      id: data.user.id,
      name: meta.name ?? '',
      username: meta.username ?? '',
      email: data.user.email ?? '',
      status: 'active',
      user_type: meta.user_type ?? 'farmer',
    });
  }

  // Start syncing — PowerSync will pull all rows the user has RLS access to
  await connectSync();

  return data;
}

export async function signOut() {
  // Stop sync first, then sign out
  await disconnectSync();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Called on app boot — restores session without requiring re-login
export async function restoreSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    await connectSync();
    return true; // online + syncing
  }

  return false; // offline-only mode
}