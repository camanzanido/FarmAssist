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
