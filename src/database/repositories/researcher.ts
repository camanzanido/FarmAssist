import { fetchAllRows, pageRange } from '../../utils/pagination';
import { placesOrFilter } from '../../utils/placeFilter';
import { ilikeAny, sanitizeSearchTerm } from '../../utils/search';
import { withTimeout } from '../../utils/withTimeout';
import { invokeFunction } from '../supabase/invokeFunction';
import { supabase } from '../supabase/supabase';
import type { Decision } from './decisions';
import type { Location } from './locations';
import type { User } from './users';

export async function fetchAllDecisions(): Promise<Decision[]> {
  return fetchAllRows<Decision>((from, to, signal) => supabase
    .from('decisions')
    .select('*')
    .order('datetime', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
}

export async function fetchAllUsers(): Promise<User[]> {
  return fetchAllRows<User>((from, to, signal) => supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
}

export async function fetchAllLocations(): Promise<Location[]> {
  return fetchAllRows<Location>((from, to, signal) => supabase
    .from('locations')
    .select('*')
    .order('city', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
}

// A municipality, identified by name pair because several location rows can share one.
export type Place = { city: string; province: string };

export interface PagedRows<T> {
  rows: T[];
  total: number;
}

export interface ResearcherDecisionRow extends Decision {
  farmer_name: string | null;
  farmer_username: string | null;
  city: string | null;
  province: string | null;
}

export interface ResearcherUserRow extends User {
  is_pending: boolean;
  last_decision_at: string | null;
}

type PageError = { code?: string } | null;

const isPastEnd = (error: PageError) => error?.code === 'PGRST103';

export async function fetchDecisionsPage(params: {
  page: number;
  pageSize: number;
  type: string | null;
  query: string;
  place?: Place | null;
}): Promise<PagedRows<ResearcherDecisionRow>> {
  const term = sanitizeSearchTerm(params.query);
  const build = (head: boolean) => {
    let q = supabase.from('researcher_decisions').select('*', { count: 'exact', head });
    if (params.type) q = q.eq('decision_type', params.type);
    if (params.place) q = q.eq('city', params.place.city).eq('province', params.place.province);
    if (term) q = q.or(ilikeAny(['result', 'farmer_name', 'farmer_username', 'city', 'province'], term));
    return q;
  };
  const { from, to } = pageRange(params.page, params.pageSize);
  const { data, count, error } = await withTimeout((signal) => build(false)
    .order('datetime', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
  if (isPastEnd(error)) return { rows: [], total: await countOnly(build) };
  if (error) throw error;
  return { rows: (data ?? []) as ResearcherDecisionRow[], total: count ?? 0 };
}

// Field users only: admin accounts are managed by the system owner in Supabase, not in the app.
export async function fetchUsersPage(params: {
  page: number;
  pageSize: number;
  query: string;
}): Promise<PagedRows<ResearcherUserRow>> {
  const term = sanitizeSearchTerm(params.query);
  const build = (head: boolean) => {
    let q = supabase.from('researcher_users').select('*', { count: 'exact', head }).eq('user_type', 'farmer');
    if (term) q = q.or(ilikeAny(['name', 'username'], term));
    return q;
  };
  const { from, to } = pageRange(params.page, params.pageSize);
  const { data, count, error } = await withTimeout((signal) => build(false)
    .order('is_pending', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
  if (isPastEnd(error)) return { rows: [], total: await countOnly(build) };
  if (error) throw error;
  return { rows: (data ?? []) as ResearcherUserRow[], total: count ?? 0 };
}

async function countOnly(build: (head: boolean) => { abortSignal: (s: AbortSignal) => PromiseLike<{ count: number | null; error: unknown }> }): Promise<number> {
  const { count, error } = await withTimeout((signal) => build(true).abortSignal(signal));
  if (error) throw error;
  return count ?? 0;
}

export interface Overview {
  total: number;
  this_month: number;
  active_farmers: number;
  new_farmers_this_month: number;
  researchers: number;
  median_gain: number;
  average_gain: number;
  range_total: number;
  per_month: { month: string; count: number }[];
  by_type: { decision_type: string; count: number }[];
  top_cities: { city: string; count: number }[];
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export interface MonthlyCounts {
  firstMonth: string | null;
  months: { month: string; count: number }[];
}

// Returns null when the backend predates researcher_monthly_counts, so callers can fall back to the overview's 6 months.
export async function fetchMonthlyCounts(from: { year: number; month: number }, months: number, places: Place[] = []): Promise<MonthlyCounts | null> {
  const pFrom = `${from.year}-${String(from.month + 1).padStart(2, '0')}-01`;
  const args = { p_from: pFrom, p_months: months, p_tz: deviceTimeZone() };
  const { data, error } = await withTimeout((signal) => supabase
    .rpc('researcher_monthly_counts', places.length > 0 ? { ...args, p_places: places } : args)
    .abortSignal(signal));
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') return null;
    throw error;
  }
  const result = data as { first_month: string | null; months: { month: string; count: number }[] | null };
  return { firstMonth: result.first_month, months: result.months ?? [] };
}

// p_places is only sent when filtering, so the unfiltered call still works before the location filter migration.
export async function fetchOverview(since: Date | null, places: Place[] = []): Promise<Overview> {
  const args = { p_since: since?.toISOString() ?? null, p_tz: deviceTimeZone() };
  const { data, error } = await withTimeout((signal) => supabase
    .rpc('researcher_overview', places.length > 0 ? { ...args, p_places: places } : args)
    .abortSignal(signal));
  if (error) throw error;
  // Before the average_gain migration the server only sends the median.
  const overview = data as Overview;
  return { ...overview, average_gain: overview.average_gain ?? overview.median_gain };
}

export interface CityStats {
  city: string;
  province: string;
  decisions: number;
  farmers: number;
  median_gain: number;
  average_gain: number;
}

export async function fetchCityStats(): Promise<CityStats[]> {
  const { data, error } = await withTimeout((signal) => supabase.rpc('researcher_city_stats').abortSignal(signal));
  if (error) throw error;
  return ((data ?? []) as CityStats[]).map((c) => ({ ...c, average_gain: c.average_gain ?? c.median_gain }));
}

function applyRange<Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(
  query: Q,
  bounds: { start: Date | null; end: Date | null }
): Q {
  let q = query;
  if (bounds.start) q = q.gte('datetime', bounds.start.toISOString());
  if (bounds.end) q = q.lt('datetime', bounds.end.toISOString());
  return q;
}

// With places, read the researcher_decisions view, which carries each decision's city and province.
function decisionsSource(columns: string, places: Place[], head = false) {
  const opts = head ? { count: 'exact' as const, head: true } : undefined;
  if (places.length === 0) return supabase.from('decisions').select(columns, opts);
  return supabase.from('researcher_decisions').select(columns, opts).or(placesOrFilter(places));
}

export async function countDecisionsInRange(bounds: { start: Date | null; end: Date | null }, places: Place[] = []): Promise<number> {
  const { count, error } = await withTimeout((signal) =>
    applyRange(decisionsSource('id', places, true), bounds).abortSignal(signal));
  if (error) throw error;
  return count ?? 0;
}

export async function fetchDecisionsInRange(bounds: { start: Date | null; end: Date | null }, places: Place[] = []): Promise<Decision[]> {
  const rows = await fetchAllRows<Record<string, unknown>>((from, to, signal) =>
    applyRange(decisionsSource('*', places), bounds)
      .order('datetime', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
      .abortSignal(signal) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>);
  if (places.length === 0) return rows as unknown as Decision[];
  // Strip the view's joined columns so exports see plain decisions.
  return rows.map(({ farmer_name: _n, farmer_username: _u, city: _c, province: _p, ...decision }) => decision as unknown as Decision);
}

// Null only when the row is missing; throws on network/RLS errors so "missing" and "unknown" differ.
export async function fetchUserRemote(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as User | null) ?? null;
}

export async function updateUserRemote(
  userId: string,
  fields: Partial<Pick<User, 'name' | 'username' | 'email' | 'status' | 'user_type' | 'terms_accepted_at' | 'terms_version'>>
): Promise<void> {
  const { error } = await withTimeout((signal) =>
    supabase.from('users').update(fields).eq('id', userId).abortSignal(signal)
  );
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
  const { error } = await withTimeout((signal) =>
    supabase.from('decisions').delete().eq('id', decisionId).abortSignal(signal)
  );
  if (error) throw error;
}

export interface NewUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  user_type: 'farmer' | 'researcher';
  city: string;
  province: string;
}

export async function createUserRemote(input: NewUserInput): Promise<string> {
  const data = await invokeFunction<{ id: string }>('create-user', input);
  if (!data.id) throw new Error('create-user returned no id');
  return data.id;
}

export async function resetPasswordRemote(userId: string, password: string): Promise<void> {
  await invokeFunction<{ ok: boolean }>('reset-password', { user_id: userId, password });
}
