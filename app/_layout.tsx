import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/AuthContext';
import { FeedbackProvider } from '../src/components/feedback/FeedbackProvider';
import { PowerSyncProvider } from '../src/database/PowerSyncProvider';

export default function RootLayout() {
  return (
    <PowerSyncProvider>
      <AuthProvider>
        <FeedbackProvider>
          <Stack screenOptions={{ headerShown: false }}
           initialRouteName="(tabs)"
          />
        </FeedbackProvider>
      </AuthProvider>
    </PowerSyncProvider>
  );
}