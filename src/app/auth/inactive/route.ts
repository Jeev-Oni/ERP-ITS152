import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// The dashboard sends deactivated accounts here: clear their session (a route handler can
// set cookies, a server component cannot), then explain on the sign-in page.
export async function GET(request: NextRequest) {
  await createClient().auth.signOut();
  return NextResponse.redirect(new URL('/login?error=deactivated', request.url));
}
