import { mean } from '../../src/utils/researcherStats';

describe('mean', () => {
  it('returns 0 for no values', () => {
    expect(mean([])).toBe(0);
  });

  it('averages positive and negative gains', () => {
    expect(mean([1000, -200, 400])).toBe(400);
  });
});
