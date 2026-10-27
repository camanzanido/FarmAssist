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
