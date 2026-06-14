import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Completes a magic-link / email sign-in: exchanges the PKCE code for a session
// (cookies are written here, which is allowed in a Route Handler) and redirects.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
