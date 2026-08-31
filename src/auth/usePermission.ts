import { useAuth } from './AuthContext';

export function usePermissions() {
  const { user, isResearcher, isFarmer, isOnline } = useAuth();

  return {
    // Decisions
    canViewOwnDecisions: !!user,
    canViewAllDecisions: isResearcher,
    canCreateDecision: !!user,           // farmers too, even offline
    canUpdateDecision: isResearcher,
    canDeleteDecision: isResearcher,

    // Options
    canManageOwnOptions: isFarmer,
    canManageAllOptions: isResearcher,

    // Reports
    canGenerateReports: isResearcher,
    canViewReports: isResearcher,

    // Stats
    canViewAggregatedStats: isResearcher,

    // Users
    canManageUsers: isResearcher,

    // Sync
    canSync: !!user && isOnline,
  };
}