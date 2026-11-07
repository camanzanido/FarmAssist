import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { copyFor, effectiveLanguage, setCurrentLanguage, type Copy, type Language } from './dictionary';
import { loadLanguage, saveLanguage } from './languageStorage';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  copy: Copy;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Renders nothing until the saved choice is read, so no screen flashes in the wrong language; the splash screen covers the wait.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLanguage().then(saved => {
      if (cancelled) return;
      setCurrentLanguage(saved);
      setLanguageState(saved);
    });
    return () => { cancelled = true; };
  }, []);

  // The module-level language flips first so getCopy() callers agree with the redraw that follows.
  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    setLanguageState(next);
    saveLanguage(next);
  }, []);

  const value = useMemo(
    () => (language ? { language, setLanguage, copy: copyFor(language) } : null),
    [language, setLanguage],
  );

  if (!value) return null;
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const noop = () => {};

// Re-provides the language for an account type without touching the saved choice, so logging out restores it.
export function LanguageOverride({ userType, children }: { userType: string | null | undefined; children: React.ReactNode }) {
  const outer = useLanguage();
  const language = effectiveLanguage(outer.language, userType);
  const overridden = language !== outer.language;
  // getCopy() callers (error messages) read the module-level language, so every render sets it before the children draw.
  setCurrentLanguage(language);

  const value = useMemo(
    () => (overridden ? { language, setLanguage: noop, copy: copyFor(language) } : outer),
    [overridden, language, outer],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

export function useCopy(): Copy {
  return useLanguage().copy;
}
