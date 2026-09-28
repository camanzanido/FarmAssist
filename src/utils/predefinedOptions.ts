import { buildOptionClimateFields, type OptionClimateFields } from '../database/repositories/options';
import { climateFieldsTo5 } from '../rcda/decisionTree';
import { expandScenario5to7 } from '../rcda/financials';

export interface PredefinedOption extends OptionClimateFields {
  id: string;
  option_name: string;
  decision_type: string;
  price: number;
  province: string | null; // null = every province
  user_id: string;
  created_at: string;
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

export function predefinedToFormValues(o: PredefinedOption): OptionFormValues {
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

export function normalizeProvince(p: string | null | undefined): string {
  return (p ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// A farmer sees options for their own province first, then ones meant for every province.
export function predefinedForProvince(options: PredefinedOption[], province: string | null | undefined): PredefinedOption[] {
  const mine = normalizeProvince(province);
  const rank = (o: PredefinedOption) => {
    const p = normalizeProvince(o.province);
    if (!p) return 1;
    return mine && p === mine ? 0 : -1;
  };
  return options
    .filter((o) => rank(o) >= 0)
    .sort((a, b) => rank(a) - rank(b) || a.option_name.localeCompare(b.option_name));
}
