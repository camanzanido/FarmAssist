import { fakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { computeRcda } from '../../src/rcda/decisionTree';
import {
  emptyFormValues,
  formValuesToClimateFields,
  OptionFormValues,
  PredefinedOption,
  predefinedForProvince,
  predefinedToFormValues,
  validateOptionForm,
} from '../../src/utils/predefinedOptions';

const CABBAGE: OptionFormValues = {
  name: 'Cabbage',
  price: '70',
  yield: ['0', '3000', '8000', '12000', '10000'],
  cost: ['20000', '100000', '150000', '150000', '170000'],
  addCost: ['0', '0', '0', '0', '0'],
};

function option(name: string, province: string | null, values = CABBAGE): PredefinedOption {
  return {
    id: name,
    option_name: name,
    decision_type: 'crop_choice',
    price: Number(values.price),
    province,
    user_id: 'researcher-1',
    created_at: '2026-09-28T00:00:00Z',
    ...formValuesToClimateFields(values),
  };
}

describe('predefined option values', () => {
  it('survive a round trip through the stored 7-point fields', () => {
    const back = predefinedToFormValues(option('Cabbage', null));
    expect(back).toEqual(CABBAGE);
  });

  it('give the same RCDA result as typing the values by hand', () => {
    const atsal: OptionFormValues = {
      name: 'Atsal',
      price: '40',
      yield: ['0', '8000', '10000', '5000', '0'],
      cost: ['30000', '100000', '100000', '120000', '30000'],
      addCost: ['0', '0', '0', '0', '0'],
    };
    const loaded = [predefinedToFormValues(option('Cabbage', null)), predefinedToFormValues(option('Atsal', null, atsal))];
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
});

describe('validateOptionForm', () => {
  it('accepts a complete form', () => {
    expect(validateOptionForm(CABBAGE)).toEqual({});
  });

  it('reports a missing name, a zero price and blank scenarios', () => {
    const errors = validateOptionForm({ ...emptyFormValues(), price: '0' });
    expect(Object.keys(errors).sort()).toEqual(['name', 'price', 'scenarios']);
  });
});

describe('predefinedForProvince', () => {
  const all = [
    option('Rice (all)', null),
    option('Corn (Laguna)', 'Laguna'),
    option('Onion (Nueva Ecija)', 'Nueva Ecija'),
    option('Atsal (all)', '  '),
  ];

  it('shows the farmer\'s province first, then options for every province, and hides other provinces', () => {
    const names = predefinedForProvince(all, ' laguna ').map((o) => o.option_name);
    expect(names).toEqual(['Corn (Laguna)', 'Atsal (all)', 'Rice (all)']);
  });

  it('shows only province-wide options when the farmer has no province', () => {
    expect(predefinedForProvince(all, null).map((o) => o.option_name)).toEqual(['Atsal (all)', 'Rice (all)']);
  });
});
