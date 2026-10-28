// Geometry for the forecast donut: 0% sits at 12 o'clock and percentages grow clockwise.

export type Boundary = 'dry' | 'wet';
export type ForecastSplit = { driest: number; wettest: number };

export function angleToPercent(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (((deg % 360) + 360) % 360) / 3.6;
}

export function percentToPoint(pct: number, radius: number, cx: number, cy: number) {
  const rad = (pct * 3.6 * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

function boundaryPosition(boundary: Boundary, { driest, wettest }: ForecastSplit): number {
  return boundary === 'dry' ? driest : 100 - wettest;
}

function circularGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 100;
  return Math.min(d, 100 - d);
}

// Picks the handle nearest the touch; when both sit on 12 o'clock the side of the circle decides.
export function nearestBoundary(pct: number, split: ForecastSplit): Boundary {
  const dryGap = circularGap(pct, boundaryPosition('dry', split));
  const wetGap = circularGap(pct, boundaryPosition('wet', split));
  if (Math.abs(dryGap - wetGap) < 0.5) return pct < 50 ? 'dry' : 'wet';
  return dryGap < wetGap ? 'dry' : 'wet';
}

// The touch as an unwrapped position, so a finger past 12 o'clock reads as -2 or 102 rather than 98 or 2.
export function startDrag(boundary: Boundary, pct: number, split: ForecastSplit): number {
  const at = boundaryPosition(boundary, split);
  return [pct - 100, pct, pct + 100].reduce((best, c) => (Math.abs(c - at) < Math.abs(best - at) ? c : best));
}

export function continueDrag(prevTrack: number, prevPct: number, pct: number): number {
  let delta = pct - prevPct;
  if (delta > 50) delta -= 100;
  else if (delta < -50) delta += 100;
  return prevTrack + delta;
}

// Moves one boundary to the tracked touch, keeping each band >= 0 and average years >= 1%.
export function applyDrag(boundary: Boundary, track: number, { driest, wettest }: ForecastSplit): ForecastSplit {
  const at = Math.round(track);
  if (boundary === 'dry') return { driest: Math.max(Math.min(at, 99 - wettest), 0), wettest };
  return { driest, wettest: 100 - Math.min(Math.max(at, driest + 1), 100) };
}
