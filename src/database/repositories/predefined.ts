import { fetchAllRows } from '../../utils/pagination';
import { formValuesToClimateFields, type OptionAverage, type OptionFormValues, type PredefinedOption } from '../../utils/predefinedOptions';
import { withTimeout } from '../../utils/withTimeout';
import { supabase } from '../supabase/supabase';

// Predefined inputs live in Supabase only: farmers load them online, researchers review and publish them online.

export async function fetchPredefinedOptions(decisionType?: string): Promise<PredefinedOption[]> {
  return fetchAllRows<PredefinedOption>((from, to, signal) => {
    let query = supabase.from('predefined_options').select('*');
    if (decisionType) query = query.eq('decision_type', decisionType);
    return query
      .order('option_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
      .abortSignal(signal);
  });
}

// RLS on the underlying tables means only researchers get every farmer's rows here.
export async function fetchOptionAverages(): Promise<OptionAverage[]> {
  return fetchAllRows<OptionAverage>((from, to, signal) => supabase
    .from('option_averages_by_location')
    .select('*')
    .order('decision_type', { ascending: true })
    .order('option_key', { ascending: true })
    .order('province', { ascending: true })
    .order('municipality', { ascending: true })
    .range(from, to)
    .abortSignal(signal));
}

export interface PredefinedInput {
  decisionType: string;
  province: string;
  municipality: string;
  values: OptionFormValues;
  source: { entries: number; farmers: number } | null;
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

function toRow(input: PredefinedInput, researcherId: string) {
  const province = clean(input.province) || null;
  return {
    option_name: clean(input.values.name),
    decision_type: input.decisionType,
    province,
    municipality: province ? clean(input.municipality) || null : null,
    price: Number(input.values.price),
    ...formValuesToClimateFields(input.values),
    source_entries: input.source?.entries ?? null,
    source_farmers: input.source?.farmers ?? null,
    published_by: researcherId,
    updated_at: new Date().toISOString(),
  };
}

export async function createPredefinedOption(input: PredefinedInput, researcherId: string): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('predefined_options')
    .insert(toRow(input, researcherId))
    .abortSignal(signal));
  if (error) throw error;
}

export async function updatePredefinedOption(id: string, input: PredefinedInput, researcherId: string): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('predefined_options')
    .update(toRow(input, researcherId))
    .eq('id', id)
    .abortSignal(signal));
  if (error) throw error;
}

export async function deletePredefinedOption(id: string): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('predefined_options')
    .delete()
    .eq('id', id)
    .abortSignal(signal));
  if (error) throw error;
}
