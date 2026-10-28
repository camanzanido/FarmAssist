// Records every filter call so the test can see what query fetchDecisionsPage built.
const calls: [string, ...unknown[]][] = [];

function query(): any {
  const q: any = {};
  for (const method of ['select', 'eq', 'or', 'order', 'range']) {
    q[method] = (...args: unknown[]) => { calls.push([method, ...args]); return q; };
  }
  q.abortSignal = () => Promise.resolve({ data: [], count: 0, error: null });
  return q;
}

jest.mock('../../src/database/supabase/supabase', () => ({
  supabase: { from: () => query() },
}));

import { fetchDecisionsPage } from '../../src/database/repositories/researcher';

beforeEach(() => { calls.length = 0; });

const eqCalls = () => calls.filter(([m]) => m === 'eq').map(([, ...args]) => args);

describe('fetchDecisionsPage place filter', () => {
  it('filters by both city and province when a place is chosen', async () => {
    await fetchDecisionsPage({ page: 1, pageSize: 20, type: null, query: '', place: { city: 'Baguio City', province: 'Benguet' } });
    expect(eqCalls()).toEqual([['city', 'Baguio City'], ['province', 'Benguet']]);
  });

  it('combines the place with the type filter', async () => {
    await fetchDecisionsPage({ page: 1, pageSize: 20, type: 'crop_variety', query: '', place: { city: 'Baguio City', province: 'Benguet' } });
    expect(eqCalls()).toEqual([['decision_type', 'crop_variety'], ['city', 'Baguio City'], ['province', 'Benguet']]);
  });

  it('adds no place filter without a place', async () => {
    await fetchDecisionsPage({ page: 1, pageSize: 20, type: null, query: '', place: null });
    expect(eqCalls()).toEqual([]);
  });
});
