import { Href, Redirect } from 'expo-router';
import React from 'react';
import { AppStartSkeleton } from '../../components/skeletons/app-skeletons';
import { useAuth } from '../AuthContext';
import { UserType } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserType[];
  redirectTo?: Href;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = '/(tabs)/profile',
  fallback = <AppStartSkeleton />,
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <>{fallback}</>;
  if (!user || !allowedRoles.includes(user.user_type)) {
    return <Redirect href={redirectTo} />;
  }

  if (user.status !== 'active') {
    return <Redirect href="/pending" />;
  }
  return <>{children}</>;
}
