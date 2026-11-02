import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { copyFor, setCurrentLanguage, type Copy, type Language } from './dictionary';
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

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

export function useCopy(): Copy {
  return useLanguage().copy;
}
