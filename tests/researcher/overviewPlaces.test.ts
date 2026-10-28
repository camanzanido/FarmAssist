// Records the rpc arguments so the test can see whether p_places was sent.
const rpcCalls: [string, Record<string, unknown>][] = [];

jest.mock('../../src/database/supabase/supabase', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push([name, args]);
      return { abortSignal: () => Promise.resolve({ data: { median_gain: 5, average_gain: 7 }, error: null }) };
    },
  },
}));

import { fetchOverview } from '../../src/database/repositories/researcher';

beforeEach(() => { rpcCalls.length = 0; });

describe('fetchOverview location filter', () => {
  it('leaves p_places out when no location is chosen, so servers before the migration still answer', async () => {
    await fetchOverview(null);
    await fetchOverview(null, []);
    for (const [name, args] of rpcCalls) {
      expect(name).toBe('researcher_overview');
      expect(args).not.toHaveProperty('p_places');
    }
  });

  it('sends the chosen places as city and province pairs', async () => {
    const places = [{ city: 'Los Baños', province: 'Laguna' }, { city: 'Baguio City', province: 'Benguet' }];
    await fetchOverview(new Date('2026-01-01T00:00:00Z'), places);
    expect(rpcCalls[0][1]).toMatchObject({ p_since: '2026-01-01T00:00:00.000Z', p_places: places });
  });
});
