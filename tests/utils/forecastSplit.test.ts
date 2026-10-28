import {
  angleToPercent, applyDrag, continueDrag, nearestBoundary, percentToPoint, startDrag, type Boundary, type ForecastSplit,
} from '../../src/utils/forecastSplit';

// Replays a finger path the way the donut's pan gesture does.
function drag(boundary: Boundary, path: number[], split: ForecastSplit): ForecastSplit {
  let track = startDrag(boundary, path[0], split);
  let result = applyDrag(boundary, track, split);
  for (let i = 1; i < path.length; i++) {
    track = continueDrag(track, path[i - 1], path[i]);
    result = applyDrag(boundary, track, result);
  }
  return result;
}

describe('angleToPercent', () => {
  it('puts 0% at 12 o\'clock and grows clockwise', () => {
    expect(angleToPercent(0, -10)).toBeCloseTo(0);
    expect(angleToPercent(10, 0)).toBeCloseTo(25);
    expect(angleToPercent(0, 10)).toBeCloseTo(50);
    expect(angleToPercent(-10, 0)).toBeCloseTo(75);
  });

  it('round-trips with percentToPoint', () => {
    for (const pct of [3, 33, 50, 67, 98]) {
      const { x, y } = percentToPoint(pct, 40, 50, 50);
      expect(angleToPercent(x - 50, y - 50)).toBeCloseTo(pct);
    }
  });
});

describe('nearestBoundary', () => {
  it('picks the closer handle', () => {
    expect(nearestBoundary(30, { driest: 33, wettest: 33 })).toBe('dry');
    expect(nearestBoundary(70, { driest: 33, wettest: 33 })).toBe('wet');
  });

  it('measures distance around 12 o\'clock', () => {
    expect(nearestBoundary(97, { driest: 2, wettest: 50 })).toBe('dry');
  });

  it('breaks a tie at 12 o\'clock by which side was touched', () => {
    expect(nearestBoundary(5, { driest: 0, wettest: 0 })).toBe('dry');
    expect(nearestBoundary(95, { driest: 0, wettest: 0 })).toBe('wet');
  });
});

describe('dragging a boundary', () => {
  const even = { driest: 33, wettest: 33 };

  it('moves the dry boundary and leaves wet alone', () => {
    expect(drag('dry', [33, 36, 40.4], even)).toEqual({ driest: 40, wettest: 33 });
  });

  it('moves the wet boundary as 100 minus the touch', () => {
    expect(drag('wet', [67, 63, 60], even)).toEqual({ driest: 33, wettest: 40 });
  });

  it('always leaves at least 1% for average years', () => {
    expect(drag('dry', [33, 60, 80, 90], even)).toEqual({ driest: 66, wettest: 33 });
    expect(drag('wet', [67, 40, 20, 10], even)).toEqual({ driest: 33, wettest: 66 });
  });

  it('stays pinned at 0 while the finger keeps going past 12 o\'clock', () => {
    expect(drag('dry', [5, 2, 98, 90, 85], even)).toEqual({ driest: 0, wettest: 33 });
  });

  it('comes back once the finger returns across 12 o\'clock', () => {
    expect(drag('dry', [5, 98, 90, 98, 4, 10], even)).toEqual({ driest: 10, wettest: 33 });
  });

  it('pins wet to 0 when dragged clockwise past 12 o\'clock', () => {
    expect(drag('wet', [97, 99, 2, 10], { driest: 33, wettest: 3 })).toEqual({ driest: 33, wettest: 0 });
  });

  it('starts a wet drag from 12 o\'clock as 100, not 0', () => {
    expect(drag('wet', [99, 95], { driest: 0, wettest: 0 })).toEqual({ driest: 0, wettest: 5 });
  });
});

describe('applyDrag with a typed-in split over 100%', () => {
  it('never returns a negative band', () => {
    expect(applyDrag('dry', 20, { driest: 50, wettest: 100 })).toEqual({ driest: 0, wettest: 100 });
  });
});
