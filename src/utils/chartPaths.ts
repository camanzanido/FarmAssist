export interface ChartPoint { x: number; y: number }

// Maps counts to points; y is inverted for SVG and padded so the stroke and dot aren't clipped.
// slots sets the x spacing, so a partial series (e.g. a year still in progress) keeps its months in place.
export function chartPoints(values: number[], width: number, height: number, padX = 6, padY = 6, slots = values.length): ChartPoint[] {
  if (values.length === 0 || width <= 0 || height <= 0) return [];
  const max = Math.max(...values, 1);
  const count = Math.max(slots, values.length);
  const step = count > 1 ? (width - padX * 2) / (count - 1) : 0;
  return values.map((v, i) => ({
    x: count > 1 ? padX + i * step : width / 2,
    y: height - padY - (Math.max(v, 0) / max) * (height - padY * 2),
  }));
}

// x of each slot, for labels and tap hit-testing.
export function slotX(index: number, slots: number, width: number, padX: number): number {
  return slots > 1 ? padX + index * ((width - padX * 2) / (slots - 1)) : width / 2;
}

// Nearest slot to a tap, clamped to the slots that have data.
export function nearestSlot(x: number, slots: number, width: number, padX: number, available: number): number {
  if (available <= 0) return -1;
  if (slots <= 1) return 0;
  const step = (width - padX * 2) / (slots - 1);
  return Math.min(Math.max(Math.round((x - padX) / step), 0), available - 1);
}

// Monotone cubic (Fritsch–Carlson) so the curve never overshoots above a peak or below zero.
export function smoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]));
  }
  tangent.push(slope[n - 2]);

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${p.x + h},${p.y + tangent[i] * h} ${q.x - h},${q.y - tangent[i + 1] * h} ${q.x},${q.y}`;
  }
  return d;
}

// Closes the line down to the baseline so it can be filled.
export function areaPath(points: ChartPoint[], line: string, baseline: number): string {
  if (points.length < 2) return '';
  return `${line} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
}
