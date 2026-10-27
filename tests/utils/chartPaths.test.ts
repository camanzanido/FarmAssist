import { areaPath, chartPoints, nearestSlot, slotX, smoothLinePath } from '../../src/utils/chartPaths';

const numbersIn = (d: string) => (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);

describe('chartPoints', () => {
  it('spreads points across the padded width and puts the max at the top', () => {
    const pts = chartPoints([0, 5, 10], 200, 100, 18, 6);
    expect(pts.map(p => p.x)).toEqual([18, 100, 182]);
    expect(pts[0].y).toBe(94);
    expect(pts[2].y).toBe(6);
  });

  it('keeps all-zero data on the baseline', () => {
    expect(chartPoints([0, 0, 0], 120, 80).every(p => p.y === 74)).toBe(true);
  });

  it('keeps a partial year on the full 12-slot grid', () => {
    const pts = chartPoints([1, 2, 3], 230, 100, 5, 6, 12);
    expect(pts.map(p => p.x)).toEqual([5, 25, 45]);
    expect(slotX(11, 12, 230, 5)).toBe(225);
  });

  it('returns nothing before the chart has a width', () => {
    expect(chartPoints([1, 2], 0, 80)).toEqual([]);
  });
});

describe('smoothLinePath', () => {
  it('never overshoots above the highest or below the lowest point', () => {
    const pts = chartPoints([0, 12, 0, 0, 30, 2], 300, 120);
    const ys = numbersIn(smoothLinePath(pts)).filter((_, i) => i % 2 === 1);
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));
    expect(ys.every(y => Number.isFinite(y) && y >= minY - 1e-9 && y <= maxY + 1e-9)).toBe(true);
  });

  it('handles flat data without NaN', () => {
    expect(smoothLinePath(chartPoints([3, 3, 3], 100, 50))).not.toMatch(/NaN|Infinity/);
  });

  it('degrades to a move for one point and nothing for none', () => {
    expect(smoothLinePath([{ x: 5, y: 5 }])).toBe('M5,5');
    expect(smoothLinePath([])).toBe('');
  });
});

describe('nearestSlot', () => {
  it('snaps a tap to the closest month', () => {
    expect(nearestSlot(31, 12, 230, 5, 12)).toBe(1);
    expect(nearestSlot(-40, 12, 230, 5, 12)).toBe(0);
  });

  it('never selects a month with no data yet', () => {
    expect(nearestSlot(220, 12, 230, 5, 10)).toBe(9);
  });

  it('returns -1 when nothing can be selected', () => {
    expect(nearestSlot(50, 12, 230, 5, 0)).toBe(-1);
  });
});

describe('areaPath', () => {
  it('closes the line down to the baseline', () => {
    const pts = chartPoints([1, 2], 100, 50);
    expect(areaPath(pts, smoothLinePath(pts), 50)).toMatch(/L94,50 L6,50 Z$/);
  });
});
