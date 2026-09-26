import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/AuthContext';
import { FeedbackProvider } from '../src/components/feedback/FeedbackProvider';
import { PowerSyncProvider } from '../src/database/PowerSyncProvider';
import { useOfflineClaimPrompt } from '../src/hooks/use-offline-claim-prompt';

function OfflineClaimPrompt() {
  useOfflineClaimPrompt();
  return null;
}

export default function RootLayout() {
  return (
    <PowerSyncProvider>
      <AuthProvider>
        <FeedbackProvider>
          <OfflineClaimPrompt />
          <Stack screenOptions={{ headerShown: false }}
           initialRouteName="(tabs)"
          />
        </FeedbackProvider>
      </AuthProvider>
    </PowerSyncProvider>
  );
}