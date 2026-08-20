import { Redirect, Stack } from 'expo-router';
import { LoadingModal } from '../../src/components/ui/loading-modal';
import { useAuth } from '../../src/auth/AuthContext';

// Signing in/up while a session is already active would silently switch
// the active Supabase user out from under whoever's currently logged in —
// bounce away instead so the only way to switch users is an explicit log out.
export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingModal visible message="Loading account…" />;
  if (user) return <Redirect href="/(tabs)/profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}