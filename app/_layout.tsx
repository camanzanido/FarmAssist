import { Stack } from 'expo-router';
import { PowerSyncProvider } from '../src/database/PowerSyncProvider';

export default function RootLayout() {
  return (
    <PowerSyncProvider>
      <Stack />
    </PowerSyncProvider>
  );
}