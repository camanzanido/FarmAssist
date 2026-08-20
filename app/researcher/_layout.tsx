import { Stack } from 'expo-router';
import { RoleGuard } from '../../src/auth/guards/RoleGuard';

export default function ResearcherLayout() {
  return (
    <RoleGuard allowedRoles={['researcher']}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
