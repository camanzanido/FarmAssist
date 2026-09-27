import type { Decision } from '../../src/database/repositories/decisions';
import type { Location } from '../../src/database/repositories/locations';
import type { User } from '../../src/database/repositories/users';
import {
  buildCsv,
  buildPdfHtml,
  ExportContext,
  ExportRange,
  exportFileName,
  filterByRange,
  rangeBounds,
  rangeLabel,
} from '../../src/utils/exportReport';

const NOW = new Date(2026, 8, 27, 10, 0); // 27 Sep 2026, local time
const SEP = { year: 2026, month: 8 };
const range = (preset: ExportRange['preset'], from = SEP, to = SEP): ExportRange => ({ preset, from, to });
const local = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h).toISOString();

function decision(id: string, datetime: string, extra: Partial<Decision> = {}): Decision {
  return {
    id,
    decision_type: 'crop_choice',
    datetime,
    location_id: 'loc-1',
    user_id: 'user-1',
    result: 'Rice',
    profit_increase: 1000,
    climate_driest: 33,
    climate_mid: 34,
    climate_wettest: 33,
    ...extra,
  };
}

const CTX: ExportContext = {
  usersById: new Map([['user-1', { id: 'user-1', name: 'Juan dela Cruz' } as User]]),
  locationsById: new Map([['loc-1', { id: 'loc-1', city: 'Los Baños', province: 'Laguna' } as Location]]),
  typeLabels: { crop_choice: 'Crop Choice' },
};

describe('rangeBounds', () => {
  it('covers the whole current month for "this month"', () => {
    expect(rangeBounds(range('this-month'), NOW)).toEqual({ start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) });
  });

  it('wraps into the previous year for "last month" in January', () => {
    const jan = new Date(2026, 0, 15);
    expect(rangeBounds(range('last-month'), jan)).toEqual({ start: new Date(2025, 11, 1), end: new Date(2026, 0, 1) });
  });

  it('includes the current month in "last 3 months"', () => {
    expect(rangeBounds(range('last-3-months'), NOW)).toEqual({ start: new Date(2026, 6, 1), end: new Date(2026, 9, 1) });
  });

  it('is unbounded for "all time"', () => {
    expect(rangeBounds(range('all'), NOW)).toEqual({ start: null, end: null });
  });

  it('accepts a custom range entered backwards', () => {
    const r = range('custom', { year: 2026, month: 5 }, { year: 2026, month: 2 });
    expect(rangeBounds(r, NOW)).toEqual({ start: new Date(2026, 2, 1), end: new Date(2026, 6, 1) });
  });
});

describe('filterByRange', () => {
  const rows = [
    decision('aug-last', local(2026, 7, 31, 23)),
    decision('sep-first', local(2026, 8, 1, 0)),
    decision('sep-last', local(2026, 8, 30, 23)),
    decision('oct-first', local(2026, 9, 1, 0)),
  ];

  it('keeps the first instant of the month and drops the first instant of the next', () => {
    const ids = filterByRange(rows, rangeBounds(range('this-month'), NOW)).map((d) => d.id);
    expect(ids).toEqual(['sep-first', 'sep-last']);
  });

  it('keeps everything, including unparseable dates, for "all time"', () => {
    const withBad = [...rows, decision('bad', 'not a date')];
    expect(filterByRange(withBad, rangeBounds(range('all'), NOW))).toHaveLength(5);
  });

  it('drops unparseable dates from a bounded range', () => {
    expect(filterByRange([decision('bad', 'nope')], rangeBounds(range('this-month'), NOW))).toEqual([]);
  });
});

describe('rangeLabel / exportFileName', () => {
  it('labels and names a single month', () => {
    expect(rangeLabel(range('this-month'), NOW)).toBe('September 2026');
    expect(exportFileName(range('this-month'), NOW, 'csv')).toBe('farmassist-decisions_2026-09.csv');
  });

  it('labels and names a span within one year', () => {
    expect(rangeLabel(range('last-3-months'), NOW)).toBe('Jul – Sep 2026');
    expect(exportFileName(range('last-3-months'), NOW, 'pdf')).toBe('farmassist-decisions_2026-07_to_2026-09.pdf');
  });

  it('labels and names a span across years', () => {
    const r = range('custom', { year: 2025, month: 10 }, { year: 2026, month: 1 });
    expect(rangeLabel(r, NOW)).toBe('Nov 2025 – Feb 2026');
    expect(exportFileName(r, NOW, 'csv')).toBe('farmassist-decisions_2025-11_to_2026-02.csv');
  });

  it('names a whole-year and an all-time export', () => {
    expect(rangeLabel(range('this-year'), NOW)).toBe('2026');
    expect(exportFileName(range('this-year'), NOW, 'csv')).toBe('farmassist-decisions_2026-01_to_2026-12.csv');
    expect(exportFileName(range('all'), NOW, 'pdf')).toBe('farmassist-decisions_all-time.pdf');
  });
});

describe('buildCsv', () => {
  const rows = [
    decision('b', local(2026, 8, 20), { result: 'Corn, "OPV"' }),
    decision('a', local(2026, 8, 2)),
  ];

  it('starts with a UTF-8 BOM and uses CRLF rows, oldest first', () => {
    const csv = buildCsv(rows, { includeFarmerLocation: false, includeClimate: false }, CTX);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('id,decision_type,datetime,result,profit_increase');
    expect(lines[1].startsWith('a,')).toBe(true);
    expect(lines[2].startsWith('b,')).toBe(true);
  });

  it('quotes commas and doubles embedded quotes', () => {
    const csv = buildCsv(rows, { includeFarmerLocation: false, includeClimate: false }, CTX);
    expect(csv).toContain(',"Corn, ""OPV""",');
  });

  it('adds farmer/location and climate columns only when asked', () => {
    const csv = buildCsv(rows, { includeFarmerLocation: true, includeClimate: true }, CTX);
    const [header, first] = csv.slice(1).split('\r\n');
    expect(header).toBe('id,decision_type,datetime,result,profit_increase,farmer,city,province,climate_driest,climate_mid,climate_wettest');
    expect(first.endsWith(',Juan dela Cruz,Los Baños,Laguna,33,34,33')).toBe(true);
  });
});

describe('buildPdfHtml', () => {
  const meta = { rangeLabel: 'September 2026', generatedAt: NOW };

  it('uses readable columns without the ID and shows the period and summary', () => {
    const html = buildPdfHtml([decision('abc-123', local(2026, 8, 2))], { includeFarmerLocation: true, includeClimate: false }, CTX, meta);
    expect(html).toContain('<th>Date</th><th>Type</th>');
    expect(html).not.toContain('abc-123');
    expect(html).toContain('<td>Crop Choice</td>');
    expect(html).toContain('Period: September 2026');
    expect(html).toContain('1 decision · 1 farmer');
  });

  it('escapes user-entered text', () => {
    const html = buildPdfHtml(
      [decision('x', local(2026, 8, 2), { result: '<script>alert(1)</script>' })],
      { includeFarmerLocation: false, includeClimate: false }, CTX, meta
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows an empty-state row when the period has no decisions', () => {
    const html = buildPdfHtml([], { includeFarmerLocation: false, includeClimate: false }, CTX, meta);
    expect(html).toContain('No decisions in this period.');
    expect(html).toContain('0 decisions · 0 farmers');
  });
});
