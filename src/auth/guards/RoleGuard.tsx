// auth/guards/RoleGuard.tsx
// Route-level guard: bounces users whose role isn't in `allowedRoles` away
// from the segment it wraps (e.g. app/researcher/_layout.tsx). Signed-out
// users count as "no role" and are redirected too, since researcher routes
// require authentication regardless of the offline-first farmer flow.
import { Href, Redirect } from 'expo-router';
import React from 'react';
import { LoadingModal } from '../../components/ui/loading-modal';
import { useAuth } from '../AuthContext';
import { UserType } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserType[];
  redirectTo?: Href;
}

export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = '/(tabs)/profile',
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingModal visible message="Loading account…" />;
  if (!user || !allowedRoles.includes(user.user_type)) {
    return <Redirect href={redirectTo} />;
  }
  return <>{children}</>;
}
