/**
 * TDD spec for deleteDecision() — src/database/repositories/decisions.ts.
 *
 * Decisions have no update operation by design (see the comment above
 * deleteDecision in the source: "Decisions are immutable records — no
 * update function intentionally"), so CRUD here is Create/Read/Delete.
 */
import { closeFakeDb, fakeDb, initFakeDb, resetFakeDb } from '../helpers/fake-db';

// See tests/decisions/create.test.ts for why these two mocks are required
// and why they must stay above the `decisions` import below.
jest.mock('../../src/database/powersync/powersync', () => ({ db: fakeDb }));
jest.mock('../../src/database/repositories/utils', () => require('../helpers/fake-generate-id'));

import { makeDecisionInput, makeOption } from '../helpers/fixtures';
import {
  createDecision,
  deleteDecision,
  getDecision,
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

describe('deleteDecision', () => {
  it('removes the decision so getDecision no longer finds it', async () => {
    const id = await createFor();
    await deleteDecision(id);
    expect(await getDecision(id)).toBeNull();
  });

  it('removes the decision from user listings', async () => {
    const id = await createFor({ user_id: 'alice' });
    await deleteDecision(id);
    const remaining = await getDecisionsByUser('alice');
    expect(remaining).toEqual([]);
  });

  it('cascades to delete both option snapshots', async () => {
    const id = await createFor();
    await deleteDecision(id);

    // Nothing left under this decision_id, checked directly against the
    // decision_options table (getDecision would already return null).
    const orphaned = await fakeDb.getAll('SELECT * FROM decision_options WHERE decision_id = ?', [id]);
    expect(orphaned).toEqual([]);
  });

  it('does not touch other decisions or their options', async () => {
    const keepId = await createFor({ user_id: 'alice' });
    const deleteId = await createFor({ user_id: 'alice' });

    await deleteDecision(deleteId);

    const kept = await getDecision(keepId);
    expect(kept).not.toBeNull();
    expect(kept!.options).toHaveLength(2);
  });

  it('is a safe no-op for an id that does not exist', async () => {
    await expect(deleteDecision('does-not-exist')).resolves.not.toThrow();
  });
});
