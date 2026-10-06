import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: BYPASSES RLS. Only ever import this from a 'use server' action that
// has already verified the caller is a system_admin. The key has no NEXT_PUBLIC_ prefix, so
// it is never shipped to the browser, and `server-only` makes the build fail if a client
// component ever imports this file.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
