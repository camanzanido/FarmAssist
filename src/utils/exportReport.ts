import type { Decision } from '../database/repositories/decisions';
import type { Location } from '../database/repositories/locations';
import type { User } from '../database/repositories/users';
import { formatCurrency } from './formatters';
import { median } from './researcherStats';

// ---------- Date range ----------

export type ExportPreset = 'this-month' | 'last-month' | 'last-3-months' | 'this-year' | 'all' | 'custom';

export interface YearMonth {
  year: number;
  month: number; // 0-11
}

export interface ExportRange {
  preset: ExportPreset;
  from: YearMonth; // used when preset is 'custom'
  to: YearMonth;
}

// End is exclusive; null means unbounded.
export interface RangeBounds {
  start: Date | null;
  end: Date | null;
}

export function yearMonthOf(date: Date): YearMonth {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  return yearMonthOf(new Date(ym.year, ym.month + delta, 1));
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

function monthStart(ym: YearMonth): Date {
  return new Date(ym.year, ym.month, 1);
}

// Custom ranges accept from/to in either order.
function orderedCustom(range: ExportRange): [YearMonth, YearMonth] {
  return compareYearMonth(range.from, range.to) <= 0 ? [range.from, range.to] : [range.to, range.from];
}

export function rangeBounds(range: ExportRange, now: Date): RangeBounds {
  const current = yearMonthOf(now);
  switch (range.preset) {
    case 'this-month':
      return { start: monthStart(current), end: monthStart(shiftMonth(current, 1)) };
    case 'last-month':
      return { start: monthStart(shiftMonth(current, -1)), end: monthStart(current) };
    case 'last-3-months':
      return { start: monthStart(shiftMonth(current, -2)), end: monthStart(shiftMonth(current, 1)) };
    case 'this-year':
      return { start: new Date(current.year, 0, 1), end: new Date(current.year + 1, 0, 1) };
    case 'all':
      return { start: null, end: null };
    case 'custom': {
      const [from, to] = orderedCustom(range);
      return { start: monthStart(from), end: monthStart(shiftMonth(to, 1)) };
    }
  }
}

const monthName = (ym: YearMonth, month: 'long' | 'short') =>
  monthStart(ym).toLocaleDateString('en-US', { month });

function spanLabel(from: YearMonth, to: YearMonth): string {
  if (compareYearMonth(from, to) === 0) return `${monthName(from, 'long')} ${from.year}`;
  if (from.year === to.year) return `${monthName(from, 'short')} – ${monthName(to, 'short')} ${to.year}`;
  return `${monthName(from, 'short')} ${from.year} – ${monthName(to, 'short')} ${to.year}`;
}

export function rangeLabel(range: ExportRange, now: Date): string {
  const current = yearMonthOf(now);
  switch (range.preset) {
    case 'this-month':
      return spanLabel(current, current);
    case 'last-month': {
      const last = shiftMonth(current, -1);
      return spanLabel(last, last);
    }
    case 'last-3-months':
      return spanLabel(shiftMonth(current, -2), current);
    case 'this-year':
      return String(current.year);
    case 'all':
      return 'All time';
    case 'custom': {
      const [from, to] = orderedCustom(range);
      return spanLabel(from, to);
    }
  }
}

export function filterByRange<T extends { datetime: string }>(rows: T[], bounds: RangeBounds): T[] {
  return rows.filter((r) => {
    const t = new Date(r.datetime).getTime();
    if (Number.isNaN(t)) return bounds.start === null && bounds.end === null;
    if (bounds.start && t < bounds.start.getTime()) return false;
    if (bounds.end && t >= bounds.end.getTime()) return false;
    return true;
  });
}

// ---------- Table ----------

export interface ExportOptions {
  includeFarmerLocation: boolean;
  includeClimate: boolean;
}

export interface ExportContext {
  usersById: Map<string, User>;
  locationsById: Map<string, Location>;
  typeLabels: Record<string, string>;
}

interface Column {
  key: string;   // CSV header, kept stable for anyone scripting against the export
  label: string; // PDF header
  raw: (d: Decision, ctx: ExportContext) => string | number;
  display?: (d: Decision, ctx: ExportContext) => string;
}

const BASE_COLUMNS: Column[] = [
  { key: 'id', label: 'ID', raw: (d) => d.id },
  { key: 'decision_type', label: 'Type', raw: (d) => d.decision_type, display: (d, c) => c.typeLabels[d.decision_type] ?? d.decision_type },
  { key: 'datetime', label: 'Date', raw: (d) => d.datetime, display: (d) => formatDay(d.datetime) },
  { key: 'result', label: 'Recommended', raw: (d) => d.result },
  { key: 'profit_increase', label: 'Gain / ha', raw: (d) => d.profit_increase, display: (d) => formatCurrency(d.profit_increase) },
];

const FARMER_COLUMNS: Column[] = [
  { key: 'farmer', label: 'Farmer', raw: (d, c) => c.usersById.get(d.user_id)?.name ?? '' },
  { key: 'city', label: 'City', raw: (d, c) => c.locationsById.get(d.location_id)?.city ?? '' },
  { key: 'province', label: 'Province', raw: (d, c) => c.locationsById.get(d.location_id)?.province ?? '' },
];

const CLIMATE_COLUMNS: Column[] = [
  { key: 'climate_driest', label: 'Dry %', raw: (d) => d.climate_driest },
  { key: 'climate_mid', label: 'Avg %', raw: (d) => d.climate_mid },
  { key: 'climate_wettest', label: 'Wet %', raw: (d) => d.climate_wettest },
];

function columnsFor(opts: ExportOptions): Column[] {
  return [
    ...BASE_COLUMNS,
    ...(opts.includeFarmerLocation ? FARMER_COLUMNS : []),
    ...(opts.includeClimate ? CLIMATE_COLUMNS : []),
  ];
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Oldest first reads naturally in a report.
function chronological(decisions: Decision[]): Decision[] {
  return [...decisions].sort((a, b) => a.datetime.localeCompare(b.datetime));
}

// ---------- CSV ----------

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCsv(decisions: Decision[], opts: ExportOptions, ctx: ExportContext): string {
  const columns = columnsFor(opts);
  const lines = [
    columns.map((c) => c.key).join(','),
    ...chronological(decisions).map((d) => columns.map((c) => csvEscape(c.raw(d, ctx))).join(',')),
  ];
  // BOM so Excel opens peso signs and accented names as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ---------- PDF (HTML for expo-print) ----------

function htmlEscape(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ReportMeta {
  rangeLabel: string;
  generatedAt: Date;
}

export function buildPdfHtml(decisions: Decision[], opts: ExportOptions, ctx: ExportContext, meta: ReportMeta): string {
  // On paper: no ID column (the CSV keeps it) and the date leads.
  const rest = columnsFor(opts).filter((c) => c.key !== 'id' && c.key !== 'datetime');
  const columns = [BASE_COLUMNS.find((c) => c.key === 'datetime')!, ...rest];
  const rows = chronological(decisions);
  const farmers = new Set(rows.map((d) => d.user_id).filter(Boolean)).size;
  const summary = [
    `${rows.length} decision${rows.length === 1 ? '' : 's'}`,
    `${farmers} farmer${farmers === 1 ? '' : 's'}`,
    `median gain ${formatCurrency(median(rows.map((d) => d.profit_increase)))}/ha`,
  ].join(' · ');

  const head = columns.map((c) => `<th>${htmlEscape(c.label)}</th>`).join('');
  const body = rows.length === 0
    ? `<tr><td class="empty" colspan="${columns.length}">No decisions in this period.</td></tr>`
    : rows.map((d) => `<tr>${columns.map((c) => `<td>${htmlEscape(c.display ? c.display(d, ctx) : c.raw(d, ctx))}</td>`).join('')}</tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0A3B28; font-size: 10pt; }
  h1 { font-size: 17pt; margin: 0 0 2pt; }
  .meta { color: #6B7B6E; margin: 0 0 3pt; }
  .summary { font-weight: 700; margin: 8pt 0 10pt; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #0A3B28; color: #fff; padding: 5pt 6pt; font-size: 9pt; }
  td { padding: 4pt 6pt; border-bottom: 1px solid #E8E2D6; }
  tr:nth-child(even) td { background: #F8F5F0; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .empty { text-align: center; color: #8A8070; padding: 16pt; }
</style></head>
<body>
  <h1>FarmAssist decisions report</h1>
  <p class="meta">Period: ${htmlEscape(meta.rangeLabel)} · Generated ${htmlEscape(meta.generatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))}</p>
  <p class="summary">${htmlEscape(summary)}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

// ---------- File name ----------

export function exportFileName(range: ExportRange, now: Date, extension: 'csv' | 'pdf'): string {
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const bounds = rangeBounds(range, now);
  let span = 'all-time';
  if (bounds.start && bounds.end) {
    const from = yearMonthOf(bounds.start);
    const to = shiftMonth(yearMonthOf(bounds.end), -1);
    span = compareYearMonth(from, to) === 0
      ? `${from.year}-${pad(from.month)}`
      : `${from.year}-${pad(from.month)}_to_${to.year}-${pad(to.month)}`;
  }
  return `farmassist-decisions_${span}.${extension}`;
}
