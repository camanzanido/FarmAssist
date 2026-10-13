import { compareVersions, newerRelease, parseLatestRelease } from '../../src/utils/appVersion';

describe('compareVersions', () => {
  it('orders by major, minor, then patch', () => {
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('treats a final release as newer than its release candidates', () => {
    expect(compareVersions('1.0.0', '1.0.0-rc3')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-rc3', '1.0.0')).toBeLessThan(0);
  });

  it('compares rc numbers numerically', () => {
    expect(compareVersions('1.0.0-rc10', '1.0.0-rc9')).toBeGreaterThan(0);
  });

  it('accepts a leading v', () => {
    expect(compareVersions('v1.2.0', '1.1.0')).toBeGreaterThan(0);
  });

  it('returns 0 for unparseable input so no false update is shown', () => {
    expect(compareVersions('0.0.0-dev.12', 'garbage')).toBe(0);
    expect(compareVersions('', '1.0.0')).toBe(0);
  });
});

describe('parseLatestRelease', () => {
  const release = { tag_name: 'v1.2.0', html_url: 'https://github.com/x/y/releases/tag/v1.2.0', draft: false, prerelease: false };

  it('extracts version and page url', () => {
    expect(parseLatestRelease(release)).toEqual({ version: '1.2.0', url: release.html_url });
  });

  it('ignores drafts, prereleases and odd tags', () => {
    expect(parseLatestRelease({ ...release, prerelease: true })).toBeNull();
    expect(parseLatestRelease({ ...release, draft: true })).toBeNull();
    expect(parseLatestRelease({ ...release, tag_name: 'nightly' })).toBeNull();
  });

  it('rejects non-release payloads such as a 404 body', () => {
    expect(parseLatestRelease({ message: 'Not Found' })).toBeNull();
    expect(parseLatestRelease(null)).toBeNull();
  });
});

describe('newerRelease', () => {
  const latest = { version: '1.1.0', url: 'u' };

  it('returns the release only when it is newer than the installed build', () => {
    expect(newerRelease('1.0.0', latest)).toBe(latest);
    expect(newerRelease('1.0.0-rc3', latest)).toBe(latest);
    expect(newerRelease('1.1.0', latest)).toBeNull();
    expect(newerRelease('1.2.0', latest)).toBeNull();
  });

  it('returns null when either side is unknown', () => {
    expect(newerRelease(null, latest)).toBeNull();
    expect(newerRelease('1.0.0', null)).toBeNull();
  });
});
