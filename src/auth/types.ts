// auth/types.ts
export type UserType = 'farmer' | 'researcher';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username: string;
  user_type: UserType;
  status: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isOnline: boolean;  // true only when signed in AND connected
}