import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Only same-site paths; stops a crafted ?next=https://evil.example from becoming an open redirect.
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

// Landing point for links in Supabase emails. It accepts both shapes Supabase can send:
//   ?code=...                (PKCE: works in the browser that asked for the reset)
//   ?token_hash=...&type=... (works from any device, needs a one-line email template change,
//                             see docs/AUTH_SETUP.md)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabase = createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(`${origin}${ok ? next : '/login?error=link-expired'}`);
}
