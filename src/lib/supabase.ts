import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials for Tatagan.sh
const DEFAULT_SUPABASE_URL = 'https://ddhqfuqskysmbxejckom.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaHFmdXFza3lzbWJ4ZWpja29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjY0MTgsImV4cCI6MjEwODgwMjQxOH0.FjCZtsokHe4hgowoa6xzZAxQ4ZMCGN0hloCnLHlYeek';

const url = (
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
).trim();

const key = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY
).trim();

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'tatagan-auth',
      },
    })
  : null;

export const SYNC_TABLE = 'tatagan_items';
