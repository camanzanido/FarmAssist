export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/["\\*%]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ilikeAny(columns: string[], term: string): string {
  return columns.map(c => `${c}.ilike."*${term}*"`).join(',');
}
