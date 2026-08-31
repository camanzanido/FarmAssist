import { fakeDb, closeFakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { expandScenario5to7 } from '../../src/rcda/financials';
import { buildOptionClimateFields, Option } from '../../src/database/repositories/options';
import { createDecision, getDecision } from '../../src/database/repositories/decisions';

beforeAll(initFakeDb);
afterEach(resetFakeDb);
afterAll(closeFakeDb);

// Same worked example as tests/rcda-test.test.ts: cabbage vs. atsal.
const OPTION_NAMES = ['cabbage', 'atsal'];
const YIELD_BY_OPTION = [
  [0.0, 3000.0, 8000.0, 12000.0, 10000.0], // cabbage
  [0.0, 8000.0, 10000.0, 5000.0, 0.0], // atsal
];
const COST_BY_OPTION = [
  [20000.0, 100000.0, 150000.0, 150000.0, 170000.0],
  [30000.0, 100000.0, 100000.0, 120000.0, 30000.0],
];
const ADD_COST_BY_OPTION = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];
const PRICE_BY_OPTION = [70, 40];
const CLIMATE = [90, 5, 5];
const DECISION_TYPE = 'crop_choice';

// Mirrors buildOptionSnapshot() in app/(decision)/result.tsx exactly.
function buildOptionSnapshot(index: number, userId: string, locationId: string): Option {
  return {
    id: '',
    option_name: OPTION_NAMES[index],
    decision_type: DECISION_TYPE,
    price: PRICE_BY_OPTION[index],
    location_id: locationId,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...buildOptionClimateFields(
      expandScenario5to7(YIELD_BY_OPTION[index]),
      expandScenario5to7(COST_BY_OPTION[index]),
      expandScenario5to7(ADD_COST_BY_OPTION[index])
    ),
  };
}

describe('result screen persistence flow', () => {
  it('persists the decision and both option snapshots for a signed-in user', async () => {
    const userId = 'user-1';
    const locationId = 'loc-1';

    const id = await createDecision({
      decision: {
        decision_type: DECISION_TYPE,
        location_id: locationId,
        user_id: userId,
        result: 'atsal',
        profit_increase: 7042,
        climate_driest: CLIMATE[0],
        climate_mid: CLIMATE[1],
        climate_wettest: CLIMATE[2],
      },
      firstOption: buildOptionSnapshot(0, userId, locationId),
      secondOption: buildOptionSnapshot(1, userId, locationId),
    });

    const saved = await getDecision(id);
    expect(saved).not.toBeNull();
    expect(saved).toMatchObject({
      decision_type: DECISION_TYPE,
      location_id: locationId,
      user_id: userId,
      result: 'atsal',
      climate_driest: 90,
      climate_mid: 5,
      climate_wettest: 5,
    });

    expect(saved!.options).toHaveLength(2);
    const [cabbage, atsal] = saved!.options;
    expect(cabbage).toMatchObject({ option_name: 'cabbage', price: 70 });
    expect(atsal).toMatchObject({ option_name: 'atsal', price: 40 });

    // Spot-check the 5->7 scenario expansion landed correctly in the snapshot.
    expect(cabbage.yield_driest).toBe(0);
    expect(cabbage.yield_very_dry).toBe(0); // copy of driest, per expandScenario5to7
    expect(cabbage.yield_below_avg).toBe(3000);
    expect(cabbage.yield_wettest).toBe(10000);
    expect(cabbage.yield_very_good).toBe(10000); // copy of wettest
  });

  it('persists successfully for a signed-out farmer, using empty user/location sentinels', async () => {
    const id = await createDecision({
      decision: {
        decision_type: DECISION_TYPE,
        location_id: '',
        user_id: '',
        result: 'atsal',
        profit_increase: 7042,
        climate_driest: CLIMATE[0],
        climate_mid: CLIMATE[1],
        climate_wettest: CLIMATE[2],
      },
      firstOption: buildOptionSnapshot(0, '', ''),
      secondOption: buildOptionSnapshot(1, '', ''),
    });

    const saved = await getDecision(id);
    expect(saved).not.toBeNull();
    expect(saved!.user_id).toBe('');
    expect(saved!.options).toHaveLength(2);
  });

  it('shows up in the user\'s decision list right after creation', async () => {
    const { getDecisionsByUser } = await import('../../src/database/repositories/decisions');
    const userId = 'user-2';

    await createDecision({
      decision: {
        decision_type: DECISION_TYPE,
        location_id: 'loc-1',
        user_id: userId,
        result: 'atsal',
        profit_increase: 7042,
        climate_driest: 90,
        climate_mid: 5,
        climate_wettest: 5,
      },
      firstOption: buildOptionSnapshot(0, userId, 'loc-1'),
      secondOption: buildOptionSnapshot(1, userId, 'loc-1'),
    });

    const decisions = await getDecisionsByUser(userId);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].result).toBe('atsal');
  });
});
