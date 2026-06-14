import { createBrowserClient } from '@supabase/ssr';

/** Browser Supabase client (anon key). Session is persisted in cookies so the
 *  server client can read it. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
