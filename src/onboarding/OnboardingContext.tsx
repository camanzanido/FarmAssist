import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { hasSeenOnboarding, markOnboardingSeen } from './onboardingStorage';

type OnboardingStatus = 'loading' | 'pending' | 'seen';

interface OnboardingContextValue {
  status: OnboardingStatus;
  complete: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Held until the flag is read so Home never flashes before the intro.
SplashScreen.preventAutoHideAsync().catch(() => {});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    hasSeenOnboarding().then(seen => {
      if (!cancelled) setStatus(seen ? 'seen' : 'pending');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // State flips first so the tabs gate lets the user through without waiting on disk.
  const complete = useCallback(() => {
    setStatus('seen');
    markOnboardingSeen();
  }, []);

  return (
    <OnboardingContext.Provider value={{ status, complete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
