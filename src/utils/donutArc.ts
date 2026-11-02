export interface ArcDash {
  dash: number;
  lead: number;
  cap: 'round' | 'butt';
}

// How to stroke one donut segment of `length` with a `gap` after it: round caps reach stroke/2 past each end of the dash,
// so the dash is shortened by a full stroke and started half a stroke (plus half the gap) into the segment.
// Segments too short for round caps stay flat, so they never spill into a neighbour.
export function arcDash(length: number, gap: number, stroke: number): ArcDash {
  if (gap <= 0) return { dash: length, lead: 0, cap: 'butt' };
  const room = length - gap;
  if (room > stroke) return { dash: room - stroke, lead: (gap + stroke) / 2, cap: 'round' };
  return { dash: Math.max(room, 0.5), lead: gap / 2, cap: 'butt' };
}

// Each segment's arc length out of `total`, with no segment under `min` so small slices still get round caps.
// The extra length comes out of the larger segments in proportion; if every minimum can't fit, all segments are equal.
export function segmentLengths(values: number[], total: number, min: number): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n * min >= total) return values.map(() => total / n);
  const pinned = values.map(() => false);
  for (;;) {
    const pinnedCount = pinned.filter(Boolean).length;
    const free = total - pinnedCount * min;
    const freeSum = values.reduce((sum, v, i) => (pinned[i] ? sum : sum + v), 0);
    const lengths = values.map((v, i) => (pinned[i] ? min : (v / freeSum) * free));
    const short = lengths.findIndex((len, i) => !pinned[i] && len < min);
    if (short === -1) return lengths;
    lengths.forEach((len, i) => { if (!pinned[i] && len < min) pinned[i] = true; });
  }
}
