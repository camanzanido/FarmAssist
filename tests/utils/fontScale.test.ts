import { cappedFontScale, MAX_FONT_SCALE } from '../../src/utils/fontScale';

describe('cappedFontScale', () => {
  it('stops at Android Large', () => {
    expect(MAX_FONT_SCALE).toBe(1.15);
  });

  it('follows Small, Default and Large exactly', () => {
    expect(cappedFontScale(0.85)).toBe(0.85);
    expect(cappedFontScale(1)).toBe(1);
    expect(cappedFontScale(1.15)).toBe(1.15);
  });

  it('holds bigger settings at the cap', () => {
    expect(cappedFontScale(1.3)).toBe(MAX_FONT_SCALE);
    expect(cappedFontScale(2)).toBe(MAX_FONT_SCALE);
  });

  it('treats invalid values as normal size', () => {
    expect(cappedFontScale(0)).toBe(1);
    expect(cappedFontScale(NaN)).toBe(1);
  });
});
