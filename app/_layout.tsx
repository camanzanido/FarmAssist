import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { FeedbackProvider } from '../src/components/feedback/FeedbackProvider';
import { TermsConsentGate } from '../src/components/terms/terms-consent-gate';
import { PowerSyncProvider } from '../src/database/PowerSyncProvider';
import { useOfflineClaimPrompt } from '../src/hooks/use-offline-claim-prompt';
import { LanguageOverride, LanguageProvider } from '../src/i18n/LanguageContext';
import { OnboardingProvider } from '../src/onboarding/OnboardingContext';

function OfflineClaimPrompt() {
  useOfflineClaimPrompt();
  return null;
}

function AccountLanguage({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <LanguageOverride userType={user?.user_type}>{children}</LanguageOverride>;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <PowerSyncProvider>
        <AuthProvider>
          <AccountLanguage>
            <OnboardingProvider>
              <FeedbackProvider>
                <OfflineClaimPrompt />
                <TermsConsentGate />
                <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}
                 initialRouteName="(tabs)"
                />
              </FeedbackProvider>
            </OnboardingProvider>
          </AccountLanguage>
        </AuthProvider>
      </PowerSyncProvider>
    </LanguageProvider>
  );
}