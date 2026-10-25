import { closeFakeDb, fakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import {
  claimLocalDecisions,
  countAnonymousStagedDecisions,
  createDecision,
  deleteDecision,
  getDecision,
  getDecisionsByUser,
  getStagedDecisionIds,
  needsStaging,
  repairUnsyncableDecisions,
  type Decision,
  type DecisionOption,
} from '../../src/database/repositories/decisions';
import { makeDecisionInput, makeOption } from '../helpers/fixtures';

beforeAll(initFakeDb);
afterEach(resetFakeDb);
afterAll(closeFakeDb);

const rowsIn = (table: string) => fakeDb.getAll<Decision>(`SELECT * FROM ${table}`);
const optionsIn = (table: string) => fakeDb.getAll<DecisionOption>(`SELECT * FROM ${table}`);

function createAnonymous(overrides: Partial<Omit<Decision, 'id' | 'datetime'>> = {}) {
  return createDecision({
    decision: makeDecisionInput({ user_id: '', location_id: '', ...overrides }),
    firstOption: makeOption(),
    secondOption: makeOption({ option_name: 'Atsal', price: 40 }),
  });
}

describe('needsStaging', () => {
  it('stages a decision with no user', () => {
    expect(needsStaging({ user_id: '', location_id: 'loc-1' })).toBe(true);
  });

  it('stages a signed-in decision whose location has not downloaded yet', () => {
    expect(needsStaging({ user_id: 'user-1', location_id: '' })).toBe(true);
  });

  it('does not stage a fully identified decision', () => {
    expect(needsStaging({ user_id: 'user-1', location_id: 'loc-1' })).toBe(false);
  });
});

describe('createDecision routing', () => {
  it('keeps an anonymous decision out of the synced table', async () => {
    await createAnonymous();

    expect(await rowsIn('decisions')).toHaveLength(0);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
    expect(await optionsIn('decision_options')).toHaveLength(0);
    expect(await optionsIn('local_decision_options')).toHaveLength(2);
  });

  it('stages a signed-in decision when the location is still a placeholder', async () => {
    await createAnonymous({ user_id: 'user-1', location_id: '' });

    expect(await rowsIn('decisions')).toHaveLength(0);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
  });

  it('writes a fully identified decision straight to the synced table', async () => {
    await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    expect(await rowsIn('decisions')).toHaveLength(1);
    expect(await rowsIn('local_decisions')).toHaveLength(0);
  });
});

describe('reading staged decisions', () => {
  it('getDecision returns a staged decision with its option snapshots', async () => {
    const id = await createAnonymous();

    const decision = await getDecision(id);

    expect(decision).not.toBeNull();
    expect(decision!.id).toBe(id);
    expect(decision!.options).toHaveLength(2);
    expect(decision!.options.map((o) => o.option_name)).toEqual(['Cabbage', 'Atsal']);
  });

  it('getDecisionsByUser lists anonymous decisions under the empty user id', async () => {
    const id = await createAnonymous();

    const rows = await getDecisionsByUser('');

    expect(rows.map((r) => r.id)).toEqual([id]);
  });

  it('still shows an unclaimed decision after its author signs in', async () => {

    const id = await createAnonymous();

    const rows = await getDecisionsByUser('user-1');

    expect(rows.map((r) => r.id)).toEqual([id]);
  });

  it('keeps showing unclaimed decisions when a type filter is applied', async () => {
    const id = await createAnonymous({ decision_type: 'protect' });

    expect((await getDecisionsByUser('user-1', 'protect')).map((r) => r.id)).toEqual([id]);
    expect(await getDecisionsByUser('user-1', 'crop_choice')).toHaveLength(0);
  });

  it('does not leak another user\'s claimed decisions', async () => {
    await createDecision({
      decision: makeDecisionInput({ user_id: 'someone-else', location_id: 'loc-2' }),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    expect(await getDecisionsByUser('user-1')).toHaveLength(0);
  });

  it('getDecisionsByUser spans both tables for a signed-in user', async () => {
    await createDecision({
      decision: makeDecisionInput({ user_id: 'user-1', location_id: 'loc-1' }),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });
    await createAnonymous({ user_id: 'user-1', location_id: '' });

    const rows = await getDecisionsByUser('user-1');

    expect(rows).toHaveLength(2);
  });
});

describe('claimLocalDecisions', () => {
  it('moves staged decisions into the synced table under the real identity', async () => {
    const id = await createAnonymous();

    const claimed = await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous');

    expect(claimed).toBe(1);
    expect(await rowsIn('local_decisions')).toHaveLength(0);
    expect(await optionsIn('local_decision_options')).toHaveLength(0);

    const synced = await rowsIn('decisions');
    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe(id);
    expect(synced[0].user_id).toBe('user-9');
    expect(synced[0].location_id).toBe('loc-9');
  });

  it('preserves the decision payload and option snapshots across the copy', async () => {
    const id = await createAnonymous({
      decision_type: 'protect',
      result: 'Delay',
      profit_increase: 12345.5,
      climate_driest: 70,
      climate_mid: 20,
      climate_wettest: 10,
    });
    const before = await getDecision(id);

    await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous');
    const after = await getDecision(id);

    expect(after).not.toBeNull();
    expect(after!.decision_type).toBe('protect');
    expect(after!.result).toBe('Delay');
    expect(after!.profit_increase).toBe(12345.5);
    expect(after!.climate_driest).toBe(70);
    expect(after!.climate_mid).toBe(20);
    expect(after!.climate_wettest).toBe(10);
    // datetime is generated at insert time and must survive the copy unchanged
    expect(after!.datetime).toBe(before!.datetime);
    expect(after!.options).toEqual(before!.options);
  });

  it('claims every staged decision in one pass', async () => {
    await createAnonymous();
    await createAnonymous();
    await createAnonymous();

    expect(await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous')).toBe(3);
    expect(await rowsIn('decisions')).toHaveLength(3);
    expect(await optionsIn('decision_options')).toHaveLength(6);
  });

  it('leaves rows staged when there is no location yet', async () => {
    await createAnonymous();
    expect(await claimLocalDecisions('user-9', '', 'own-and-anonymous')).toBe(0);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
    expect(await rowsIn('decisions')).toHaveLength(0);
  });

  it('leaves rows staged when there is no user yet', async () => {
    await createAnonymous();

    expect(await claimLocalDecisions('', 'loc-9', 'own-and-anonymous')).toBe(0);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
  });

  it('is a no-op when nothing is staged', async () => {
    expect(await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous')).toBe(0);
  });

  it('does not touch decisions that already belong to someone', async () => {
    await createDecision({
      decision: makeDecisionInput({ user_id: 'user-1', location_id: 'loc-1' }),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous');

    const synced = await rowsIn('decisions');
    expect(synced).toHaveLength(1);
    expect(synced[0].user_id).toBe('user-1');
    expect(synced[0].location_id).toBe('loc-1');
  });

  describe('ownership scope', () => {
    it("'own' claims the user's own staged decisions", async () => {
      const id = await createAnonymous({ user_id: 'user-9', location_id: '' });

      expect(await claimLocalDecisions('user-9', 'loc-9', 'own')).toBe(1);
      const synced = await rowsIn('decisions');
      expect(synced.map((d) => d.id)).toEqual([id]);
      expect(synced[0].location_id).toBe('loc-9');
    });

    it("'own' leaves decisions made while signed out alone", async () => {
      await createAnonymous();

      expect(await claimLocalDecisions('user-9', 'loc-9', 'own')).toBe(0);
      expect(await rowsIn('local_decisions')).toHaveLength(1);
      expect(await rowsIn('decisions')).toHaveLength(0);
    });

    it("'own-and-anonymous' claims both the user's and ownerless decisions", async () => {
      await createAnonymous({ user_id: 'user-9', location_id: '' });
      await createAnonymous();

      expect(await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous')).toBe(2);
      expect(await rowsIn('local_decisions')).toHaveLength(0);
    });

    it("never claims a decision staged under another user's id", async () => {
      const othersId = await createAnonymous({ user_id: 'user-1', location_id: '' });

      expect(await claimLocalDecisions('user-9', 'loc-9', 'own')).toBe(0);
      expect(await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous')).toBe(0);

      const staged = await rowsIn('local_decisions');
      expect(staged.map((d) => d.id)).toEqual([othersId]);
      expect(staged[0].user_id).toBe('user-1');
      expect(await optionsIn('local_decision_options')).toHaveLength(2);
    });
  });
});

describe('countAnonymousStagedDecisions', () => {
  it('counts only decisions made while signed out', async () => {
    await createAnonymous();
    await createAnonymous();
    await createAnonymous({ user_id: 'user-1', location_id: '' });

    expect(await countAnonymousStagedDecisions()).toBe(2);
  });

  it('is zero once they are claimed', async () => {
    await createAnonymous();
    await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous');

    expect(await countAnonymousStagedDecisions()).toBe(0);
  });
});

describe('getStagedDecisionIds', () => {
  it('reports staged decisions so history can mark them as not sent', async () => {
    const id = await createAnonymous();

    expect(await getStagedDecisionIds()).toEqual([id]);
  });

  it('stops reporting them once they are claimed', async () => {
    await createAnonymous();
    await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous');

    expect(await getStagedDecisionIds()).toEqual([]);
  });

  it('does not report decisions written straight to the synced table', async () => {
    await createDecision({
      decision: makeDecisionInput(),
      firstOption: makeOption(),
      secondOption: makeOption({ option_name: 'Atsal' }),
    });

    expect(await getStagedDecisionIds()).toEqual([]);
  });
});

describe('deleteDecision', () => {
  it('deletes a staged decision and its options', async () => {
    const id = await createAnonymous();

    await deleteDecision(id);

    expect(await rowsIn('local_decisions')).toHaveLength(0);
    expect(await optionsIn('local_decision_options')).toHaveLength(0);
    expect(await getDecision(id)).toBeNull();
  });
});

describe('repairUnsyncableDecisions', () => {
  async function seedLegacyRow(id: string, userId: string, locationId: string) {
    await fakeDb.execute(
      `INSERT INTO decisions (id, decision_type, datetime, location_id, user_id, result,
        profit_increase, climate_driest, climate_mid, climate_wettest)
       VALUES (?, 'crop_choice', '2026-09-21T16:40:57.074Z', ?, ?, 'Corn', 21986, 45, 15, 40)`,
      [id, locationId, userId]
    );
    await fakeDb.execute(
      `INSERT INTO decision_options (id, decision_id, option_slot, option_name, price)
       VALUES (?, ?, 0, 'Corn', 30)`,
      [`${id}-opt`, id]
    );
  }

  it('moves legacy placeholder rows into staging', async () => {
    await seedLegacyRow('legacy-1', '', '');

    expect(await repairUnsyncableDecisions()).toBe(1);
    expect(await rowsIn('decisions')).toHaveLength(0);
    expect(await optionsIn('decision_options')).toHaveLength(0);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
    expect(await optionsIn('local_decision_options')).toHaveLength(1);
  });

  it('also rescues rows that have a user but no location', async () => {
    await seedLegacyRow('legacy-2', 'user-1', '');

    expect(await repairUnsyncableDecisions()).toBe(1);
    expect(await rowsIn('local_decisions')).toHaveLength(1);
  });

  it('leaves healthy synced rows alone', async () => {
    await seedLegacyRow('healthy', 'user-1', 'loc-1');

    expect(await repairUnsyncableDecisions()).toBe(0);
    expect(await rowsIn('decisions')).toHaveLength(1);
    expect(await rowsIn('local_decisions')).toHaveLength(0);
  });

  it('hands repaired rows to the normal claim path', async () => {
    await seedLegacyRow('legacy-3', '', '');

    await repairUnsyncableDecisions();
    expect(await claimLocalDecisions('user-9', 'loc-9', 'own-and-anonymous')).toBe(1);

    const synced = await rowsIn('decisions');
    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe('legacy-3');
    expect(synced[0].user_id).toBe('user-9');
    expect(synced[0].location_id).toBe('loc-9');
  });

  it('is a no-op on a clean database', async () => {
    expect(await repairUnsyncableDecisions()).toBe(0);
  });
});
