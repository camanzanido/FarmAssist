import { fakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import type { OptionClimateFields } from '../../src/database/climateFields';
import { computeRcda } from '../../src/rcda/decisionTree';
import {
  climateRowToFormValues,
  emptyFormValues,
  formValuesToClimateFields,
  OptionFormValues,
  placeLabel,
  PredefinedOption,
  predefinedForLocation,
  predefinedKey,
  validateOptionForm,
} from '../../src/utils/predefinedOptions';

const CABBAGE: OptionFormValues = {
  name: 'Cabbage',
  price: '70',
  yield: ['0', '3000', '8000', '12000', '10000'],
  cost: ['20000', '100000', '150000', '150000', '170000'],
  addCost: ['0', '0', '0', '0', '0'],
};

function option(name: string, province: string | null, municipality: string | null = null, values = CABBAGE): PredefinedOption {
  return {
    id: name,
    option_name: name,
    decision_type: 'crop_choice',
    price: Number(values.price),
    province,
    municipality,
    source_entries: null,
    source_farmers: null,
    published_by: 'researcher-1',
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
    ...formValuesToClimateFields(values),
  };
}

describe('predefined option values', () => {
  it('survive a round trip through the stored 7-point fields', () => {
    expect(climateRowToFormValues(option('Cabbage', null))).toEqual(CABBAGE);
  });

  it('give the same RCDA result as typing the values by hand', () => {
    const atsal: OptionFormValues = {
      name: 'Atsal',
      price: '40',
      yield: ['0', '8000', '10000', '5000', '0'],
      cost: ['30000', '100000', '100000', '120000', '30000'],
      addCost: ['0', '0', '0', '0', '0'],
    };
    const loaded = [climateRowToFormValues(option('Cabbage', null)), climateRowToFormValues(option('Atsal', null, null, atsal))];
    const toInputs = (vs: OptionFormValues[]) => ({
      optionNames: vs.map((v) => v.name),
      yield: vs.map((v) => v.yield.map(Number)),
      cost: vs.map((v) => v.cost.map(Number)),
      addCost: vs.map((v) => v.addCost.map(Number)),
      price: vs.map((v) => Number(v.price)),
      climate: [90, 5, 5],
    });
    expect(computeRcda(toInputs(loaded)).averages).toEqual(computeRcda(toInputs([CABBAGE, atsal])).averages);
  });

  // The view averages the stored 7-point columns; this only works because the 5->7 expansion is linear.
  it('averaged per column in the view, equal the average of what farmers typed', () => {
    const other: OptionFormValues = {
      name: 'Cabbage',
      price: '90',
      yield: ['1000', '5000', '9000', '10000', '6000'],
      cost: ['40000', '80000', '120000', '160000', '150000'],
      addCost: ['0', '2000', '4000', '6000', '8000'],
    };
    const a = formValuesToClimateFields(CABBAGE);
    const b = formValuesToClimateFields(other);
    const averaged = Object.fromEntries(
      Object.keys(a).map((k) => [k, (a[k as keyof OptionClimateFields] + b[k as keyof OptionClimateFields]) / 2])
    ) as unknown as OptionClimateFields;

    const mean = (x: string[], y: string[]) => x.map((v, i) => String((Number(v) + Number(y[i])) / 2));
    const back = climateRowToFormValues({ ...averaged, option_name: 'Cabbage', price: 80 });
    expect(back.yield).toEqual(mean(CABBAGE.yield, other.yield));
    expect(back.cost).toEqual(mean(CABBAGE.cost, other.cost));
    expect(back.addCost).toEqual(mean(CABBAGE.addCost, other.addCost));
  });
});

describe('validateOptionForm', () => {
  it('accepts a complete form', () => {
    expect(validateOptionForm(CABBAGE)).toEqual({});
  });

  it('reports a missing name, a zero price and blank scenarios', () => {
    const errors = validateOptionForm({ ...emptyFormValues(), price: '0' });
    expect(Object.keys(errors).sort()).toEqual(['name', 'price', 'scenarios']);
  });

  it('accepts the 2-decimal values the averages view returns', () => {
    const values = climateRowToFormValues({ ...formValuesToClimateFields(CABBAGE), option_name: 'Cabbage', price: 66.67 });
    expect(validateOptionForm(values)).toEqual({});
  });
});

describe('predefinedKey', () => {
  it('ignores case and spacing, like the unique index', () => {
    const a = { decision_type: 'crop_choice', option_name: ' Rice  IR64', province: 'Laguna', municipality: 'Los Baños' };
    const b = { decision_type: 'crop_choice', option_name: 'rice ir64', province: ' laguna ', municipality: 'LOS BAÑOS' };
    expect(predefinedKey(a)).toBe(predefinedKey(b));
  });

  it('treats a blank place the same as a missing one', () => {
    const a = { decision_type: 'crop_choice', option_name: 'Rice', province: '', municipality: '' };
    const b = { decision_type: 'crop_choice', option_name: 'Rice', province: null, municipality: null };
    expect(predefinedKey(a)).toBe(predefinedKey(b));
  });
});

describe('placeLabel', () => {
  it('names the municipality, the province, or everywhere', () => {
    expect(placeLabel({ province: 'Laguna', municipality: 'Calamba' })).toBe('Calamba, Laguna');
    expect(placeLabel({ province: 'Laguna', municipality: null })).toBe('Laguna');
    expect(placeLabel({ province: null, municipality: null })).toBe('All provinces');
  });
});

describe('predefinedForLocation', () => {
  const all = [
    option('Rice (all)', null),
    option('Corn (Laguna)', 'Laguna'),
    option('Onion (Calamba)', 'Laguna', 'Calamba'),
    option('Squash (Bay)', 'Laguna', 'Bay'),
    option('Onion (Nueva Ecija)', 'Nueva Ecija'),
    option('Atsal (all)', '  '),
  ];

  it('orders own municipality, own province, rest of the province, then everywhere, and hides other provinces', () => {
    const names = predefinedForLocation(all, { city: ' calamba ', province: ' laguna ' }).map((o) => o.option_name);
    expect(names).toEqual(['Onion (Calamba)', 'Corn (Laguna)', 'Squash (Bay)', 'Atsal (all)', 'Rice (all)']);
  });

  it('shows only options for everywhere when the farmer has no location', () => {
    expect(predefinedForLocation(all, null).map((o) => o.option_name)).toEqual(['Atsal (all)', 'Rice (all)']);
  });
});
