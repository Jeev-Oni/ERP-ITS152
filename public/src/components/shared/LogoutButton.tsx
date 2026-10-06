'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Signs out of Supabase (clears the session cookies), then sends the user to /login so
// they can sign in as a different account.
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh(); // drop cached server-component data from the previous user
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {loading ? 'Signing out…' : 'Log out'}
    </button>
  );
}
