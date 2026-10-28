import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './supabase';

// A throwaway client kept in memory, so checking or resetting a password never signs the app in or out.
export function createScratchClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'farmassist-scratch',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
