import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Server Supabase client. NOTE: in Next.js 16 `cookies()` is async, so this
 *  factory is async and must be awaited. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Setting cookies is not allowed during Server Component rendering.
            // The proxy refreshes the session cookie, so this is safe to ignore.
          }
        },
      },
    },
  );
}
