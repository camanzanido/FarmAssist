import { copyFor, getCopy, getCurrentLanguage, LANGUAGES, setCurrentLanguage, type Language } from '../../src/i18n/dictionary';
import { getActionErrorMessage, getAuthErrorMessage } from '../../src/utils/errors';

type Problem = string;

// Walks both dictionaries side by side; tsc already checks the shape, this catches empty text and arity slips.
function compare(en: unknown, other: unknown, path: string, problems: Problem[]) {
  if (typeof en === 'string') {
    if (typeof other !== 'string') problems.push(`${path}: not a string`);
    else if (other.trim() === '') problems.push(`${path}: empty`);
    return;
  }
  if (typeof en === 'function') {
    if (typeof other !== 'function') problems.push(`${path}: not a function`);
    else if (other.length !== en.length) problems.push(`${path}: takes ${other.length} arguments, English takes ${en.length}`);
    return;
  }
  if (Array.isArray(en)) {
    if (!Array.isArray(other)) problems.push(`${path}: not an array`);
    else if (other.length !== en.length) problems.push(`${path}: ${other.length} items, English has ${en.length}`);
    else en.forEach((item, i) => compare(item, other[i], `${path}[${i}]`, problems));
    return;
  }
  if (en && typeof en === 'object') {
    if (!other || typeof other !== 'object') {
      problems.push(`${path}: not an object`);
      return;
    }
    for (const key of Object.keys(en)) compare((en as any)[key], (other as any)[key], `${path}.${key}`, problems);
    for (const key of Object.keys(other)) if (!(key in en)) problems.push(`${path}.${key}: not in English`);
  }
}

describe('dictionaries', () => {
  afterEach(() => setCurrentLanguage('en'));

  it.each(LANGUAGES)('%s has every English entry, none empty', (lang: Language) => {
    const problems: Problem[] = [];
    compare(copyFor('en'), copyFor(lang), lang, problems);
    expect(problems).toEqual([]);
  });

  it('defaults to English and follows the chosen language', () => {
    expect(getCurrentLanguage()).toBe('en');
    expect(getCopy()).toBe(copyFor('en'));
    setCurrentLanguage('fil');
    expect(getCurrentLanguage()).toBe('fil');
    expect(getCopy()).toBe(copyFor('fil'));
  });

  it('formats every function entry to non-empty text', () => {
    for (const lang of LANGUAGES) {
      const c = copyFor(lang);
      const samples = [
        c.namingCopy.subtitle('Crop Choice'),
        c.dataEntryCopy.filledCount(3),
        c.resultCopy.verdict('Rice'),
        c.resultCopy.keepInMindBody(['dry', 'average'], ['wet'], [], 'Rice', 'Corn'),
        c.resultCopy.normalYearBetter('Rice', '₱1,000'),
        c.historyCopy.subtitle(1),
        c.historyCopy.subtitle(2),
        c.claimCopy.promptBody(2),
        c.authCopy.attemptsLeft(1),
        c.decisionResultLabel(''),
        c.helpCopy.termHelpLabel('Yield'),
      ];
      samples.forEach(text => expect(text.trim()).not.toBe(''));
    }
  });

  it('Filipino is translated, apart from names that stay the same in both', () => {
    const SAME_IN_BOTH = /^(FarmAssist|Offline|Sync|Email|EMAIL|USERNAME|CODE|Username|Password|Admin|Field user|FIELD|ADMIN|Home|Profile|Developer|camanzanido@up\.edu\.ph|UPLB-INREM & UPLB-ICS)$/;
    const same: string[] = [];
    const walk = (en: unknown, fil: unknown, path: string) => {
      if (typeof en === 'string') {
        if (en === fil && !SAME_IN_BOTH.test(en)) same.push(path);
      } else if (en && typeof en === 'object') {
        for (const key of Object.keys(en)) {
          if (key === 'icon' || key === 'key' || key === 'id') continue;
          walk((en as any)[key], (fil as any)?.[key], `${path}.${key}`);
        }
      }
    };
    walk(copyFor('en'), copyFor('fil'), 'fil');
    expect(same).toEqual([]);
  });

  it('keeps a saved result name as it was typed', () => {
    for (const lang of LANGUAGES) expect(copyFor(lang).decisionResultLabel('Rice IR64')).toBe('Rice IR64');
  });
});

describe('error messages follow the chosen language', () => {
  afterEach(() => setCurrentLanguage('en'));

  it.each(LANGUAGES)('%s offline and permission messages', (lang: Language) => {
    setCurrentLanguage(lang);
    const e = copyFor(lang).errorCopy;
    expect(getAuthErrorMessage(new Error('Network request failed'), 'fallback')).toBe(e.offline);
    expect(getActionErrorMessage({ code: '42501' }, 'fallback')).toBe(e.permission);
    expect(getAuthErrorMessage(new Error('Invalid login credentials'), 'fallback')).toBe(e.invalidCredentials);
  });
});
