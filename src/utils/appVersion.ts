export const RELEASES_URL = 'https://api.github.com/repos/camanzanido/FarmAssist/releases/latest';

export interface LatestRelease {
  version: string;
  url: string;
}

type Parsed = { core: number[]; pre: string | null };

function parse(v: string): Parsed | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim());
  if (!m) return null;
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
}

// Returns >0 when a is newer than b, <0 when older, 0 when equal or either is unparseable.
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i];
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre.localeCompare(pb.pre, undefined, { numeric: true });
}

export function parseLatestRelease(json: unknown): LatestRelease | null {
  if (!json || typeof json !== 'object') return null;
  const { tag_name, html_url, draft, prerelease } = json as Record<string, unknown>;
  if (typeof tag_name !== 'string' || typeof html_url !== 'string') return null;
  if (draft || prerelease || !parse(tag_name)) return null;
  return { version: tag_name.replace(/^v/, ''), url: html_url };
}

export function newerRelease(current: string | null, latest: LatestRelease | null): LatestRelease | null {
  if (!current || !latest) return null;
  return compareVersions(latest.version, current) > 0 ? latest : null;
}
