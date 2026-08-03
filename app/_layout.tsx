import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/AuthContext';
import { PowerSyncProvider } from '../src/database/PowerSyncProvider';

export default function RootLayout() {
  return (
    <PowerSyncProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}
         initialRouteName="(tabs)"
        />
      </AuthProvider>
    </PowerSyncProvider>
  );
}