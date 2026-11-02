import { arcDash } from '../../src/utils/donutArc';

// What the eye sees: the dash plus any round caps.
const visible = (a: ReturnType<typeof arcDash>, stroke: number) => a.dash + (a.cap === 'round' ? stroke : 0);

describe('arcDash', () => {
  it('draws a lone segment as a full flat ring', () => {
    expect(arcDash(300, 0, 18)).toEqual({ dash: 300, lead: 0, cap: 'butt' });
  });

  it('rounds a normal segment and leaves exactly the gap open', () => {
    const a = arcDash(120, 6, 18);
    expect(a).toEqual({ dash: 96, lead: 12, cap: 'round' });
    expect(visible(a, 18) + 6).toBe(120);
  });

  it('keeps a segment too short for round caps flat and inside its share', () => {
    const a = arcDash(20, 6, 18);
    expect(a.cap).toBe('butt');
    expect(visible(a, 18) + 6).toBe(20);
    expect(a.lead).toBe(3);
  });

  it('never returns a negative dash', () => {
    expect(arcDash(2, 6, 18).dash).toBe(0.5);
  });
});

describe('segmentLengths', () => {
  const { segmentLengths } = require('../../src/utils/donutArc');

  it('keeps proportional lengths when every segment is long enough', () => {
    expect(segmentLengths([1, 1, 2], 400, 24)).toEqual([100, 100, 200]);
  });

  it('gives a tiny segment the minimum and takes it from the others proportionally', () => {
    const out: number[] = segmentLengths([1, 49, 50], 400, 24);
    expect(out[0]).toBe(24);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(400);
    expect(out[1] / out[2]).toBeCloseTo(49 / 50);
  });

  it('lets a tiny segment keep round caps once it has the minimum', () => {
    const [tiny] = segmentLengths([1, 99], 400, 18 + 4 + 1);
    expect(arcDash(tiny, 4, 18).cap).toBe('round');
  });

  it('splits evenly when there is not room for every minimum', () => {
    expect(segmentLengths([1, 1, 1, 97], 60, 24)).toEqual([15, 15, 15, 15]);
  });
});
