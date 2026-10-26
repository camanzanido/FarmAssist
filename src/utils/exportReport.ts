import { DecisionTypeColors } from '../constants/colors';
import { decisionResultLabel } from '../constants/copy';
import type { Decision } from '../database/repositories/decisions';
import type { Location } from '../database/repositories/locations';
import type { User } from '../database/repositories/users';
import { formatCurrency } from './formatters';
import { mean } from './researcherStats';

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
  includeCharts?: boolean; // PDF only; a CSV has nowhere to put a chart
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
  { key: 'result', label: 'Recommended', raw: (d) => d.result, display: (d) => decisionResultLabel(d.result) },
  { key: 'profit_increase', label: 'Gain / ha', raw: (d) => d.profit_increase, display: (d) => formatCurrency(d.profit_increase) },
];

const FARMER_COLUMNS: Column[] = [
  { key: 'farmer', label: 'Field user', raw: (d, c) => c.usersById.get(d.user_id)?.name ?? '' },
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

// Text starting with = + - @ tab or CR runs as a formula in Excel, so it gets a ' prefix; numbers stay numeric.
function csvEscape(value: string | number): string {
  let str = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
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

// ---------- Charts ----------

export interface ChartBar {
  key: string;
  label: string;
  count: number;
}

const CHART_MONTHS = 12;
const TOP_CITIES = 5;

// Every month from the first to the last decision (at most the latest 12), so quiet months show as gaps.
export function monthlyCounts(decisions: Decision[]): ChartBar[] {
  const times = decisions.map((d) => new Date(d.datetime).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length === 0) return [];
  const last = yearMonthOf(new Date(Math.max(...times)));
  let month = yearMonthOf(new Date(Math.min(...times)));
  const earliest = shiftMonth(last, -(CHART_MONTHS - 1));
  if (compareYearMonth(month, earliest) < 0) month = earliest;

  const counts = new Map<string, number>();
  for (const t of times) {
    const ym = yearMonthOf(new Date(t));
    const key = `${ym.year}-${ym.month}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const bars: ChartBar[] = [];
  for (; compareYearMonth(month, last) <= 0; month = shiftMonth(month, 1)) {
    const key = `${month.year}-${month.month}`;
    bars.push({ key, label: monthStart(month).toLocaleDateString('en-US', { month: 'short' }), count: counts.get(key) ?? 0 });
  }
  return bars;
}

export function typeCounts(decisions: Decision[], ctx: ExportContext): ChartBar[] {
  const counts = new Map<string, number>();
  for (const d of decisions) counts.set(d.decision_type, (counts.get(d.decision_type) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: ctx.typeLabels[key] ?? key, count }));
}

export function cityCounts(decisions: Decision[], ctx: ExportContext): ChartBar[] {
  const counts = new Map<string, number>();
  for (const d of decisions) {
    const city = ctx.locationsById.get(d.location_id)?.city?.trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_CITIES)
    .map(([city, count]) => ({ key: city, label: city, count }));
}

function monthChartHtml(bars: ChartBar[]): string {
  const max = Math.max(1, ...bars.map((b) => b.count));
  const cols = bars.map((b) => `<div class="col">
      <span class="colVal">${b.count}</span>
      <div class="colBar" style="height:${Math.round((b.count / max) * 100)}%"></div>
      <span class="colLbl">${htmlEscape(b.label)}</span>
    </div>`).join('');
  return `<div class="chart"><h2>Decisions per month</h2><div class="cols">${cols}</div></div>`;
}

function typeChartHtml(bars: ChartBar[]): string {
  const size = 110;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = bars.reduce((sum, b) => sum + b.count, 0);
  let start = 0;
  const arcs = bars.map((b) => {
    const len = (b.count / total) * circ;
    const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${DecisionTypeColors[b.key] ?? '#B8B0A0'}" stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-start).toFixed(2)}" />`;
    start += len;
    return arc;
  }).join('');
  const legend = bars.map((b) => `<div class="legend"><i style="background:${DecisionTypeColors[b.key] ?? '#B8B0A0'}"></i>${htmlEscape(b.label)}<b>${b.count} · ${Math.round((b.count / total) * 100)}%</b></div>`).join('');
  return `<div class="chart"><h2>Decision types</h2><div class="donutRow">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="rotate(-90 ${size / 2} ${size / 2})">${arcs}</g></svg>
    <div class="legends">${legend}</div></div></div>`;
}

function cityChartHtml(bars: ChartBar[]): string {
  const max = Math.max(1, ...bars.map((b) => b.count));
  const rows = bars.map((b) => `<div class="hbar">
      <div class="hbarTop"><span>${htmlEscape(b.label)}</span><b>${b.count}</b></div>
      <div class="hbarTrack"><div class="hbarFill" style="width:${Math.round((b.count / max) * 100)}%"></div></div>
    </div>`).join('');
  return `<div class="chart"><h2>Top municipalities</h2>${rows}</div>`;
}

export function chartsHtml(decisions: Decision[], ctx: ExportContext): string {
  if (decisions.length === 0) return '';
  const cities = cityCounts(decisions, ctx);
  return `<div class="charts">${monthChartHtml(monthlyCounts(decisions))}${typeChartHtml(typeCounts(decisions, ctx))}${cities.length > 0 ? cityChartHtml(cities) : ''}</div>`;
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
    `${farmers} field user${farmers === 1 ? '' : 's'}`,
    `average gain ${formatCurrency(mean(rows.map((d) => d.profit_increase)))}/ha`,
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
  .charts { display: flex; gap: 12pt; margin: 0 0 14pt; page-break-inside: avoid; }
  .chart { flex: 1; border: 1px solid #E8E2D6; border-radius: 8pt; padding: 9pt 11pt; }
  .chart h2 { font-size: 10.5pt; margin: 0 0 8pt; }
  .cols { display: flex; align-items: flex-end; gap: 4pt; height: 110pt; }
  .col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
  .colBar { width: 100%; max-width: 22pt; min-height: 1.5pt; background: #2E7D52; border-radius: 2pt 2pt 0 0; }
  .colVal { font-size: 7.5pt; color: #6B7B6E; margin-bottom: 2pt; }
  .colLbl { font-size: 7.5pt; color: #6B7B6E; margin-top: 3pt; }
  .donutRow { display: flex; align-items: center; gap: 12pt; }
  .legends { flex: 1; }
  .legend { display: flex; align-items: center; gap: 5pt; font-size: 8.5pt; margin: 3pt 0; }
  .legend i { width: 7pt; height: 7pt; border-radius: 50%; display: inline-block; }
  .legend b { margin-left: auto; }
  .hbar { margin: 0 0 7pt; }
  .hbarTop { display: flex; justify-content: space-between; font-size: 8.5pt; margin-bottom: 2pt; }
  .hbarTrack { height: 6pt; background: #F0EBE1; border-radius: 3pt; overflow: hidden; }
  .hbarFill { height: 100%; background: #2E7D52; border-radius: 3pt; }
</style></head>
<body>
  <h1>FarmAssist decisions report</h1>
  <p class="meta">Period: ${htmlEscape(meta.rangeLabel)} · Generated ${htmlEscape(meta.generatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))}</p>
  <p class="summary">${htmlEscape(summary)}</p>
  ${opts.includeCharts ? chartsHtml(rows, ctx) : ''}
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
