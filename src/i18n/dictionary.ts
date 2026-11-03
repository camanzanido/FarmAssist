import * as en from '../constants/copy';
import { fil } from './fil';

export type Language = 'en' | 'fil';

// Filipino first: it is the language most field users read best.
export const LANGUAGES: Language[] = ['fil', 'en'];

// Each name is written in its own language so a person who can't read the other one still finds theirs.
export const LANGUAGE_NAMES: Record<Language, string> = { fil: 'Filipino', en: 'English' };

// English keeps the device's own date format, as before this setting existed.
const DATE_LOCALES: Record<Language, string | undefined> = { en: undefined, fil: 'fil-PH' };

// Turns English string literals into plain strings so another language can fill them; icon names, keys and ids stay exact.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { [K in keyof T]: K extends 'icon' | 'key' | 'id' ? T[K] : Widen<T[K]> }
        : T;

export type Copy = Widen<typeof en>;

const DICTIONARIES: Record<Language, Copy> = { en, fil };

let current: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'fil';
}

// Admins always work in English; everyone else gets the language saved on the device.
export function effectiveLanguage(saved: Language, userType: string | null | undefined): Language {
  return userType === 'researcher' ? 'en' : saved;
}

export function setCurrentLanguage(language: Language): void {
  current = language;
}

export function getCurrentLanguage(): Language {
  return current;
}

export function copyFor(language: Language): Copy {
  return DICTIONARIES[language];
}

// For code outside React (services, error mapping); components use useCopy() so they redraw on a switch.
export function getCopy(): Copy {
  return DICTIONARIES[current];
}

export function dateLocale(language: Language = current): string | undefined {
  return DATE_LOCALES[language];
}
