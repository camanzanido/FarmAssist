// auth/AuthContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { db } from '../database/powersync/powersync';
import { supabase } from '../database/supabase/supabase';
import { restoreSession, signIn, signOut, signUp } from './authService';
import { AuthState, AuthUser, UserType } from './types';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    username: string;
    user_type: UserType;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  isResearcher: boolean;
  isFarmer: boolean;
}

type Action =
  | { type: 'SET_USER'; payload: AuthUser }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE'; payload: boolean };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    case 'CLEAR_USER':
      return { ...state, user: null, isOnline: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    isLoading: true,
    isOnline: false,
  });

  const loadUserProfile = useCallback(async (userId: string) => {
    const profile = await db.getOptional<AuthUser>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    if (profile) {
      dispatch({ type: 'SET_USER', payload: profile });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Boot: try to restore session, fall back to offline mode
  useEffect(() => {
    async function boot() {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check for existing local user first (enables offline use immediately)
      const anyUser = await db.getOptional<AuthUser>('SELECT * FROM users LIMIT 1');
      if (anyUser) {
        dispatch({ type: 'SET_USER', payload: anyUser });
      }

      // Then attempt to restore cloud session in background
      const isOnline = await restoreSession();
      dispatch({ type: 'SET_ONLINE', payload: isOnline });

      if (isOnline) {
        const { data } = await supabase.auth.getUser();
        if (data.user) await loadUserProfile(data.user.id);
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    }

    boot();
  }, [loadUserProfile]);

  // Keep auth state in sync with Supabase session changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          dispatch({ type: 'SET_ONLINE', payload: true });
          await loadUserProfile(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
          dispatch({ type: 'CLEAR_USER' });
        }
        if (event === 'TOKEN_REFRESHED') {
          dispatch({ type: 'SET_ONLINE', payload: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user } = await signIn(email, password);
      if (user) await loadUserProfile(user.id);
      dispatch({ type: 'SET_ONLINE', payload: true });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadUserProfile]);

  const handleSignUp = useCallback(async (params: {
    email: string;
    password: string;
    name: string;
    username: string;
    user_type: UserType;
  }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user } = await signUp(params);
      if (user) await loadUserProfile(user.id);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadUserProfile]);

  const handleSignOut = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await signOut();
      dispatch({ type: 'CLEAR_USER' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        isResearcher: state.user?.user_type === 'researcher',
        isFarmer: state.user?.user_type === 'farmer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}