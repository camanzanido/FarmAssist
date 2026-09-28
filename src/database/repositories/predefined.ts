import { fetchAllRows } from '../../utils/pagination';
import { formValuesToClimateFields, type OptionFormValues, type PredefinedOption } from '../../utils/predefinedOptions';
import { withTimeout } from '../../utils/withTimeout';
import { supabase } from '../supabase/supabase';
import { generateId } from './utils';

// Predefined options live in Supabase only: farmers load them online, researchers manage them online.

export async function fetchPredefinedOptions(decisionType?: string): Promise<PredefinedOption[]> {
  return fetchAllRows<PredefinedOption>((from, to, signal) => {
    let query = supabase.from('options').select('*').eq('is_predefined', true);
    if (decisionType) query = query.eq('decision_type', decisionType);
    return query
      .order('option_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
      .abortSignal(signal);
  });
}

export interface PredefinedInput {
  decisionType: string;
  province: string;
  values: OptionFormValues;
}

function toRow(input: PredefinedInput) {
  return {
    option_name: input.values.name.trim(),
    decision_type: input.decisionType,
    province: input.province.trim().replace(/\s+/g, ' ') || null,
    price: Number(input.values.price),
    ...formValuesToClimateFields(input.values),
  };
}

export async function createPredefinedOption(input: PredefinedInput, researcherId: string): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('options')
    .insert({
      id: generateId(),
      ...toRow(input),
      is_predefined: true,
      location_id: null,
      user_id: researcherId,
      created_at: new Date().toISOString(),
    })
    .abortSignal(signal));
  if (error) throw error;
}

export async function updatePredefinedOption(id: string, input: PredefinedInput): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('options')
    .update(toRow(input))
    .eq('id', id)
    .eq('is_predefined', true)
    .abortSignal(signal));
  if (error) throw error;
}

export async function deletePredefinedOption(id: string): Promise<void> {
  const { error } = await withTimeout((signal) => supabase
    .from('options')
    .delete()
    .eq('id', id)
    .eq('is_predefined', true)
    .abortSignal(signal));
  if (error) throw error;
}
