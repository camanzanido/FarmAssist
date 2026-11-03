// Text follows the system font size up to Android's Large setting; bigger settings stop here so nothing clips.
export const MAX_FONT_SCALE = 1.15;

export function cappedFontScale(fontScale: number): number {
  if (!Number.isFinite(fontScale) || fontScale <= 0) return 1;
  return Math.min(fontScale, MAX_FONT_SCALE);
}
