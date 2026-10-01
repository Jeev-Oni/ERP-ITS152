import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Radio, ShieldCheck } from 'lucide-react';
import { SidebarNav } from '@/components/shared/SidebarNav';

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
    .select('full_name, role, department')
    .eq('id', user.id)
    .single();

  const roleLabel = ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar — echoes the PH1 Command logo treatment: a bordered icon box + wordmark */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        {/* Logo now links home — previously dead text, a dead end once you'd navigated away. */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-primary/40 bg-accent">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-foreground">JJPG TRADING</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Phase 1 ERP</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {profile?.role === 'system_admin' && (
            <ShieldCheck className="h-4 w-4 text-primary" aria-label="System Admin" />
          )}
          <div className="text-right">
            <p className="text-sm text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-primary">{roleLabel}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 shrink-0 border-r border-border bg-surface p-4">
          <SidebarNav isSystemAdmin={profile?.role === 'system_admin'} />
        </aside>
        <main className="flex-1 bg-background p-6 text-muted">{children}</main>
      </div>
    </div>
  );
}
