import { supabase } from '../supabase/supabase';
import type { Decision } from './decisions';
import type { Location } from './locations';
import type { User } from './users';

export async function fetchAllDecisions(): Promise<Decision[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .order('datetime', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Decision[];
}

export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as User[];
}

export async function fetchAllLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('city', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function updateUserRemote(
  userId: string,
  fields: Partial<Pick<User, 'name' | 'username' | 'email' | 'status' | 'user_type'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(fields).eq('id', userId);
  if (error) throw error;
}

export async function upsertUserRemote(user: Omit<User, 'created_at'>): Promise<void> {
  const { error } = await supabase.from('users').upsert(user);
  if (error) throw error;
}

export async function createLocationRemote(data: Omit<Location, 'id'>): Promise<string> {
  const { data: row, error } = await supabase
    .from('locations')
    .insert(data)
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
}

export async function deleteDecisionRemote(decisionId: string): Promise<void> {
  const { error } = await supabase.from('decisions').delete().eq('id', decisionId);
  if (error) throw error;
}
