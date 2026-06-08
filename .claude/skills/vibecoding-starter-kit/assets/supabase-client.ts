import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client.
 * Use in: Client Components ('use client').
 * For: sign-in flows, real-time subscriptions, client-side auth state.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
