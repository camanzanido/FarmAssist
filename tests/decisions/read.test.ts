import { closeFakeDb, fakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { makeDecisionInput, makeOption } from '../helpers/fixtures';
import {
  createDecision,
  getDecision,
  getDecisionsByLocation,
  getDecisionsByUser,
} from '../../src/database/repositories/decisions';

beforeAll(initFakeDb);
afterEach(resetFakeDb);
afterAll(closeFakeDb);

async function createFor(overrides: Parameters<typeof makeDecisionInput>[0] = {}) {
  return createDecision({
    decision: makeDecisionInput(overrides),
    firstOption: makeOption({ option_name: 'Cabbage' }),
    secondOption: makeOption({ option_name: 'Atsal' }),
  });
}

async function setDatetime(decisionId: string, isoString: string) {
  await fakeDb.execute('UPDATE decisions SET datetime = ? WHERE id = ?', [isoString, decisionId]);
}

describe('getDecision', () => {
  it('returns null for an id that does not exist', async () => {
    const result = await getDecision('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns the decision with its options attached for a real id', async () => {
    const id = await createFor();
    const result = await getDecision(id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(id);
    expect(result!.options).toHaveLength(2);
  });
});

describe('getDecisionsByUser', () => {
  it('returns [] for a user with no decisions', async () => {
    const result = await getDecisionsByUser('nobody');
    expect(result).toEqual([]);
  });

  it('only returns decisions belonging to the requested user', async () => {
    await createFor({ user_id: 'alice' });
    await createFor({ user_id: 'alice' });
    await createFor({ user_id: 'bob' });

    const aliceDecisions = await getDecisionsByUser('alice');
    const bobDecisions = await getDecisionsByUser('bob');

    expect(aliceDecisions).toHaveLength(2);
    expect(bobDecisions).toHaveLength(1);
    expect(aliceDecisions.every(d => d.user_id === 'alice')).toBe(true);
  });

  it('filters by decision_type when one is given', async () => {
    await createFor({ user_id: 'alice', decision_type: 'crop_choice' });
    await createFor({ user_id: 'alice', decision_type: 'harvest' });

    const cropChoiceOnly = await getDecisionsByUser('alice', 'crop_choice');

    expect(cropChoiceOnly).toHaveLength(1);
    expect(cropChoiceOnly[0].decision_type).toBe('crop_choice');
  });

  it('orders results by datetime, most recent first', async () => {
    const older = await createFor({ user_id: 'alice' });
    const newer = await createFor({ user_id: 'alice' });
    await setDatetime(older, '2026-01-01T00:00:00.000Z');
    await setDatetime(newer, '2026-06-01T00:00:00.000Z');

    const result = await getDecisionsByUser('alice');

    expect(result.map(d => d.id)).toEqual([newer, older]);
  });
});

describe('getDecisionsByLocation', () => {
  it('only returns decisions recorded at the requested location', async () => {
    await createFor({ location_id: 'loc-north' });
    await createFor({ location_id: 'loc-south' });

    const north = await getDecisionsByLocation('loc-north');

    expect(north).toHaveLength(1);
    expect(north[0].location_id).toBe('loc-north');
  });

  it('returns [] for a location with no decisions', async () => {
    const result = await getDecisionsByLocation('nowhere');
    expect(result).toEqual([]);
  });
});
