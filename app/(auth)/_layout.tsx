import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { LoadingModal } from '../../src/components/ui/loading-modal';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingModal visible message="Loading account…" />;
  if (user) return <Redirect href={user.user_type === 'researcher' ? '/researcher/dashboard' : '/(tabs)'} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}