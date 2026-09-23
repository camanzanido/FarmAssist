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

  if (user.status !== 'active') {
    return <Redirect href="/pending" />;
  }
  return <>{children}</>;
}
