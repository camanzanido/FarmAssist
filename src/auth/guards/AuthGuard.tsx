// auth/guards/AuthGuard.tsx
// Redirects to sign-in if no user at all (not even offline)
import React from 'react';
import { useAuth } from '../AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback: React.ReactNode; // e.g. <SignInScreen />
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // or a splash screen
  if (!user) return <>{fallback}</>;
  return <>{children}</>;
}