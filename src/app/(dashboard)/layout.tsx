import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { KeyRound, Radio, ShieldCheck } from 'lucide-react';
import { SidebarNav } from '@/components/shared/SidebarNav';
import { LogoutButton } from '@/components/shared/LogoutButton';

const ROLE_LABELS: Record<string, string> = {
  admin_staff: 'Admin Staff',
  hr_payroll_officer: 'HR / Payroll Officer',
  management: 'Management',
  finance: 'Finance',
  warehouse_staff: 'Warehouse Staff',
  warehouse_supervisor: 'Warehouse Supervisor',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  fleet_supervisor: 'Fleet Supervisor',
  system_admin: 'System Admin',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department, is_active')
    .eq('id', user.id)
    .single();

  // A deactivated account keeps no data access (migration 0011), but is also signed out here
  // with an explanation instead of being left on empty pages.
  if (profile && profile.is_active === false) redirect('/auth/inactive');

  const roleLabel = ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—';
  const initials =
    (profile?.full_name ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || '?';

  return (
    <div className="app-bg flex min-h-screen flex-col">
      {/* Sticky top bar: bordered icon box + wordmark, then who is signed in */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-primary/40 bg-accent">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.14em] text-foreground">JJPG TRADING</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Phase 1 ERP</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 pr-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-accent text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight text-foreground">{profile?.full_name}</p>
              <p className="flex items-center justify-end gap-1 text-xs leading-tight text-primary">
                {profile?.role === 'system_admin' && <ShieldCheck className="h-3 w-3" aria-hidden />}
                {roleLabel}
              </p>
            </div>
          </div>
          <Link
            href="/reset-password"
            className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-[61px] h-[calc(100vh-61px)] w-64 shrink-0 overflow-y-auto border-r border-border bg-surface/60 p-4 backdrop-blur">
          <SidebarNav isSystemAdmin={profile?.role === 'system_admin'} />
        </aside>
        <main className="min-w-0 flex-1 px-8 py-8 text-muted">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
