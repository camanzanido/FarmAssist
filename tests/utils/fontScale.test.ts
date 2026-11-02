import { cappedFontScale, MAX_FONT_SCALE } from '../../src/utils/fontScale';

describe('cappedFontScale', () => {
  it('follows the system size up to the cap', () => {
    expect(cappedFontScale(1)).toBe(1);
    expect(cappedFontScale(1.15)).toBe(1.15);
    expect(cappedFontScale(2)).toBe(MAX_FONT_SCALE);
  });

  it('passes smaller sizes through and treats invalid values as normal', () => {
    expect(cappedFontScale(0.85)).toBe(0.85);
    expect(cappedFontScale(0)).toBe(1);
    expect(cappedFontScale(NaN)).toBe(1);
  });
});
