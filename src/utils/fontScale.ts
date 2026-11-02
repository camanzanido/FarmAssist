// Fixed-size chrome (tab bar, odometer digits) follows the system font size only this far before it would clip.
export const MAX_FONT_SCALE = 1.3;

export function cappedFontScale(fontScale: number): number {
  if (!Number.isFinite(fontScale) || fontScale <= 0) return 1;
  return Math.min(fontScale, MAX_FONT_SCALE);
}
