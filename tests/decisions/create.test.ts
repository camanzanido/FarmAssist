import { fakeDb, closeFakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { makeDecisionInput, makeOption } from '../helpers/fixtures';
import { createDecision, getDecision } from '../../src/database/repositories/decisions';

beforeAll(initFakeDb);
afterEach(resetFakeDb);
afterAll(closeFakeDb);

describe('createDecision', () => {
  it('returns a newly generated decision id', async () => {
    const id = await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal', price: 40 }),
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates a different id for every call', async () => {
    const id1 = await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });
    const id2 = await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    expect(id1).not.toBe(id2);
  });

  it('persists the decision fields exactly as given', async () => {
    const decisionInput = makeDecisionInput({
      decision_type: 'harvest',
      result: 'Delay',
      profit_increase: 12345.5,
      climate_driest: 90,
      climate_mid: 5,
      climate_wettest: 5,
    });

    const id = await createDecision({
      decision: decisionInput,
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    const saved = await getDecision(id);
    expect(saved).not.toBeNull();
    expect(saved).toMatchObject(decisionInput);
    expect(saved!.id).toBe(id);
  });

  it('stamps datetime automatically as a recent ISO timestamp', async () => {
    const before = Date.now();
    const id = await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });
    const after = Date.now();

    const saved = await getDecision(id);
    const savedMs = new Date(saved!.datetime).getTime();
    expect(savedMs).toBeGreaterThanOrEqual(before);
    expect(savedMs).toBeLessThanOrEqual(after);
  });

  it('snapshots both options, in slot order, alongside the decision', async () => {
    const id = await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption({ option_name: 'Cabbage', price: 70 }),
      secondOption: makeOption({ option_name: 'Atsal', price: 40 }),
    });

    const saved = await getDecision(id);
    expect(saved!.options).toHaveLength(2);
    expect(saved!.options[0]).toMatchObject({ option_slot: 0, option_name: 'Cabbage', price: 70 });
    expect(saved!.options[1]).toMatchObject({ option_slot: 1, option_name: 'Atsal', price: 40 });
  });

  it('snapshots the full climate-scenario breakdown for each option', async () => {
    const firstOption = makeOption({
      option_name: 'Cabbage',
      yield_driest: 0,
      yield_very_dry: 900,
      yield_below_avg: 3000,
      yield_average: 8000,
      yield_above_avg: 12000,
      yield_very_good: 10666.666666666666,
      yield_wettest: 10000,
    });

    const id = await createDecision({
      decision: makeDecisionInput(),
      firstOption,
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    const saved = await getDecision(id);
    const cabbageSnapshot = saved!.options[0];
    expect(cabbageSnapshot.yield_driest).toBe(0);
    expect(cabbageSnapshot.yield_very_dry).toBe(900);
    expect(cabbageSnapshot.yield_average).toBe(8000);
    expect(cabbageSnapshot.yield_very_good).toBeCloseTo(10666.666666666666, 6);
    expect(cabbageSnapshot.yield_wettest).toBe(10000);
  });

  it('does not let two decisions bleed into each other\'s options', async () => {
    const idA = await createDecision({
      decision: makeDecisionInput({ result: 'Cabbage' }),
      firstOption: makeOption({ option_name: 'Cabbage' }),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });
    const idB = await createDecision({
      decision: makeDecisionInput({ result: 'Rice' }),
      firstOption: makeOption({ option_name: 'Rice' }),
      secondOption: makeOption({ option_name: 'Corn' }),
    });

    const savedA = await getDecision(idA);
    const savedB = await getDecision(idB);

    expect(savedA!.options.map(o => o.option_name)).toEqual(['Cabbage', 'Atsal']);
    expect(savedB!.options.map(o => o.option_name)).toEqual(['Rice', 'Corn']);
    expect(savedA!.options.every(o => o.decision_id === idA)).toBe(true);
    expect(savedB!.options.every(o => o.decision_id === idB)).toBe(true);
  });
});
