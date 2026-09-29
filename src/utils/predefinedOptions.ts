import { buildOptionClimateFields, type OptionClimateFields } from '../database/repositories/options';
import { climateFieldsTo5 } from '../rcda/decisionTree';
import { expandScenario5to7 } from '../rcda/financials';

// Researcher-reviewed values farmers can load (public.predefined_options).
export interface PredefinedOption extends OptionClimateFields {
  id: string;
  option_name: string;
  decision_type: string;
  price: number;
  province: string | null;     // null = every province
  municipality: string | null; // null = the whole province
  source_entries: number | null;
  source_farmers: number | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

// One row of the option_averages_by_location view: what farmers in a municipality entered, averaged.
export interface OptionAverage extends OptionClimateFields {
  decision_type: string;
  option_key: string;
  option_name: string;
  province: string;
  municipality: string;
  total_entries: number;
  farmer_count: number;
  latest_entry: string | null;
  price: number;
}

// What the forms edit: plain number strings (see numberInput.ts), 5 scenarios each.
export interface OptionFormValues {
  name: string;
  price: string;
  yield: string[];
  cost: string[];
  addCost: string[];
}

export const emptyFormValues = (): OptionFormValues => ({
  name: '',
  price: '',
  yield: ['', '', '', '', ''],
  cost: ['', '', '', '', ''],
  addCost: ['', '', '', '', ''],
});

export function climateRowToFormValues(o: OptionClimateFields & { option_name: string; price: number }): OptionFormValues {
  const five = climateFieldsTo5(o);
  const str = (n: number) => String(n ?? '');
  return {
    name: o.option_name,
    price: str(o.price),
    yield: five.yield.map(str),
    cost: five.cost.map(str),
    addCost: five.addCost.map(str),
  };
}

export function formValuesToClimateFields(v: OptionFormValues): OptionClimateFields {
  const nums = (xs: string[]) => expandScenario5to7(xs.map(Number));
  return buildOptionClimateFields(nums(v.yield), nums(v.cost), nums(v.addCost));
}

const NUMBER = /^\d+(\.\d*)?$/;
const isNumber = (s: string) => NUMBER.test(s.trim());

export interface FormErrors {
  name?: string;
  price?: string;
  scenarios?: string;
}

export function validateOptionForm(v: OptionFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!v.name.trim()) errors.name = 'Enter a name.';
  if (!isNumber(v.price) || Number(v.price) <= 0) errors.price = 'Selling price must be greater than 0.';
  if (![...v.yield, ...v.cost, ...v.addCost].every(isNumber)) errors.scenarios = 'Fill in yield, cost and additional cost for all 5 scenarios.';
  return errors;
}

export function normalizePlace(p: string | null | undefined): string {
  return (p ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Mirrors predefined_options_unique_place_idx, so the app can tell when a publish would replace an existing row.
export function predefinedKey(o: { decision_type: string; option_name: string; province: string | null; municipality: string | null }): string {
  return [o.decision_type, normalizePlace(o.option_name), normalizePlace(o.province), normalizePlace(o.municipality)].join('|');
}

export function placeLabel(o: { province: string | null; municipality: string | null }, everywhere = 'All provinces'): string {
  const province = o.province?.trim();
  const municipality = o.municipality?.trim();
  if (municipality && province) return `${municipality}, ${province}`;
  return province || everywhere;
}

// Farmers see their municipality first, then their province, then everywhere; other provinces are hidden.
export function predefinedForLocation(
  options: PredefinedOption[],
  location: { city: string | null; province: string | null } | null
): PredefinedOption[] {
  const myProvince = normalizePlace(location?.province);
  const myCity = normalizePlace(location?.city);
  const rank = (o: PredefinedOption) => {
    const province = normalizePlace(o.province);
    const city = normalizePlace(o.municipality);
    if (!province) return 3;
    if (!myProvince || province !== myProvince) return -1;
    if (!city) return 1;
    return myCity && city === myCity ? 0 : 2;
  };
  return options
    .filter((o) => rank(o) >= 0)
    .sort((a, b) => rank(a) - rank(b) || a.option_name.localeCompare(b.option_name));
}
