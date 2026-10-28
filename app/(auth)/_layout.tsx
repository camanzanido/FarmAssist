import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { AuthFormSkeleton } from '../../src/components/skeletons/app-skeletons';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AuthFormSkeleton />;
  if (user) return <Redirect href={user.user_type === 'researcher' ? '/researcher/dashboard' : '/(tabs)'} />;

  return <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }} />;
}