import { isDormant } from '../../src/utils/userActivity';

const NOW = new Date('2026-10-02T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const farmer = (over: Partial<Parameters<typeof isDormant>[0]> = {}) => ({
  user_type: 'farmer',
  status: 'active',
  created_at: daysAgo(800),
  last_decision_at: null as string | null,
  ...over,
});

describe('isDormant', () => {
  it('flags a farmer whose last decision is over a year old', () => {
    expect(isDormant(farmer({ last_decision_at: daysAgo(366) }), NOW)).toBe(true);
  });

  it('does not flag a farmer with a recent decision, even on an old account', () => {
    expect(isDormant(farmer({ last_decision_at: daysAgo(30) }), NOW)).toBe(false);
  });

  it('falls back to the signup date when the farmer never made a decision', () => {
    expect(isDormant(farmer({ created_at: daysAgo(730) }), NOW)).toBe(true);
    expect(isDormant(farmer({ created_at: daysAgo(30) }), NOW)).toBe(false);
  });

  it('only flags active farmers', () => {
    expect(isDormant(farmer({ status: 'inactive' }), NOW)).toBe(false);
    expect(isDormant(farmer({ status: 'pending' }), NOW)).toBe(false);
    expect(isDormant(farmer({ user_type: 'researcher' }), NOW)).toBe(false);
  });

  it('does not flag anyone when the server has not been migrated (field missing)', () => {
    const legacy = { ...farmer({ created_at: daysAgo(730) }), last_decision_at: undefined as unknown as null };
    expect(isDormant(legacy, NOW)).toBe(false);
  });

  it('treats an unparseable date as not dormant', () => {
    expect(isDormant(farmer({ created_at: 'not a date' }), NOW)).toBe(false);
  });
});
