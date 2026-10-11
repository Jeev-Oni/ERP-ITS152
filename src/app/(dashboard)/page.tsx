import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, Route, Truck, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/roles';
import { STAT_ACCESS } from '@/lib/access';

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

const DEPARTMENT_LABELS: Record<string, string> = {
  hr_administration: 'HR & Administration',
  warehouse_operations: 'Warehouse Operations',
  delivery_logistics: 'Delivery & Logistics',
  executive: 'Executive',
};

type AttentionItem = { label: string; href: string };
type QuickLink = { label: string; href: string };

const QUICK_LINKS: Record<string, QuickLink[]> = {
  admin_staff: [{ label: 'Log today\u2019s attendance', href: '/hr/attendance' }],
  hr_payroll_officer: [
    { label: 'Open a new payroll cutoff', href: '/hr/payroll' },
    { label: 'View payslips', href: '/hr/payslips' },
  ],
  management: [{ label: 'Review payroll approvals', href: '/hr/payroll' }],
  finance: [{ label: 'View payroll disbursements', href: '/hr/payroll' }],
  warehouse_staff: [
    { label: 'Record a stock movement', href: '/warehouse/stock-movements' },
    { label: 'Assign a storage location', href: '/warehouse/storage-locations' },
  ],
  warehouse_supervisor: [
    { label: 'Verify stock movements', href: '/warehouse/stock-movements' },
    { label: 'Audit storage locations', href: '/warehouse/storage-locations' },
  ],
  dispatcher: [{ label: 'Plan a new dispatch', href: '/logistics/dispatch' }],
  driver: [{ label: 'View your trips', href: '/logistics/trips' }],
  fleet_supervisor: [
    { label: 'Review trips awaiting close-out', href: '/logistics/trips' },
    { label: 'Manage the truck fleet', href: '/logistics/trucks' },
  ],
  system_admin: [{ label: 'Manage user accounts', href: '/admin/users' }],
};

export default async function DashboardHome({ searchParams }: { searchParams?: { notice?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department')
    .eq('id', user!.id)
    .single();

  const role = profile?.role as string | undefined;
  const today = new Date().toISOString().slice(0, 10);

  // --- At a Glance: only the numbers for work this role manages (see STAT_ACCESS in
  // src/lib/access.ts). Each count is only queried when it will be shown, and a role never
  // sees a card for a table RLS won't let it read, which would just be a misleading 0. ---
  const statDefs = [
    {
      label: 'Active Payroll Cutoffs',
      icon: Wallet,
      roles: STAT_ACCESS.payrollCutoffs,
      count: () => supabase.from('payroll_cutoffs').select('id', { count: 'exact', head: true }).neq('status', 'disbursed'),
    },
    {
      label: 'Unresolved Discrepancies',
      icon: AlertTriangle,
      roles: STAT_ACCESS.discrepancies,
      alertWhenPositive: true,
      count: () => supabase.from('stock_discrepancies').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    },
    {
      label: 'Trips In Transit',
      icon: Route,
      roles: STAT_ACCESS.tripsInTransit,
      count: () => supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['dispatched', 'en_route']),
    },
    {
      label: 'Active Trucks',
      icon: Truck,
      roles: STAT_ACCESS.activeTrucks,
      count: () => supabase.from('trucks').select('id', { count: 'exact', head: true }).eq('is_active', true),
    },
  ].filter((def) => hasRole(role, [...def.roles]));

  const statCounts = await Promise.all(statDefs.map((def) => def.count()));
  const stats = statDefs.map((def, i) => ({
    label: def.label,
    icon: def.icon,
    value: statCounts[i].count ?? 0,
    alert: !!def.alertWhenPositive && (statCounts[i].count ?? 0) > 0,
  }));
  const STAT_GRID: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };

  // --- Needs Your Attention: tailored per role, mirroring myMapúa's personalized
  // Remarks list — only what's actually actionable for this specific viewer. ---
  const attention: AttentionItem[] = [];

  if (role === 'admin_staff') {
    const { count: activeEmployees } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    const { data: loggedToday } = await supabase
      .from('attendance_logs')
      .select('employee_id')
      .eq('log_date', today);
    const loggedCount = new Set((loggedToday ?? []).map((l) => l.employee_id)).size;
    const remaining = (activeEmployees ?? 0) - loggedCount;
    if (remaining > 0) {
      attention.push({ label: `${remaining} employee(s) not yet logged for today`, href: '/hr/attendance' });
    }
  }

  if (role === 'hr_payroll_officer') {
    const { count: openCount } = await supabase
      .from('payroll_cutoffs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    const { count: revisionCount } = await supabase
      .from('payroll_cutoffs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'revision_needed');
    if (openCount) attention.push({ label: `${openCount} cutoff(s) ready to close`, href: '/hr/payroll' });
    if (revisionCount)
      attention.push({ label: `${revisionCount} cutoff(s) sent back \u2014 recompute needed`, href: '/hr/payroll' });
  }

  if (role === 'management') {
    const { count } = await supabase
      .from('payroll_cutoffs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'computed');
    if (count) attention.push({ label: `${count} payroll cutoff(s) awaiting your approval`, href: '/hr/payroll' });
  }

  if (role === 'finance') {
    const { count } = await supabase
      .from('payroll_cutoffs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');
    if (count) attention.push({ label: `${count} cutoff(s) approved \u2014 ready to disburse`, href: '/hr/payroll' });
  }

  if (role === 'warehouse_supervisor') {
    const { count: discrepancyCount } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'discrepancy');
    const { count: pendingVerify } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'logged');
    if (discrepancyCount)
      attention.push({ label: `${discrepancyCount} discrepancy report(s) need investigation`, href: '/warehouse/stock-movements' });
    if (pendingVerify)
      attention.push({ label: `${pendingVerify} movement(s) awaiting verification`, href: '/warehouse/stock-movements' });
  }

  if (role === 'dispatcher') {
    const { count } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivery_failed');
    if (count) attention.push({ label: `${count} failed delivery(s) need rescheduling`, href: '/logistics/dispatch' });
  }

  if (role === 'fleet_supervisor') {
    const { count: needsCloseOut } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered');
    const { count: maintenanceDue } = await supabase
      .from('maintenance_schedule')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lte('scheduled_date', today);
    if (needsCloseOut)
      attention.push({ label: `${needsCloseOut} trip(s) need trip & maintenance log update`, href: '/logistics/trips' });
    if (maintenanceDue)
      attention.push({ label: `${maintenanceDue} maintenance job(s) due`, href: '/logistics/trucks' });
  }

  const quickLinks = (role && QUICK_LINKS[role]) || [];

  // Greeting and date use the company's timezone, not the server's.
  const TZ = 'Asia/Manila';
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ });
  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';

  const SECTION = 'mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';

  return (
    <div className="space-y-9">
      {/* Welcome hero: same rings-and-glow language as the sign-in screen */}
      <section className="panel relative overflow-hidden p-8">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(520px 260px at 92% 0%, hsl(41 47% 56% / 0.12), transparent 65%)' }}
        />
        <div aria-hidden className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-primary/10" />
        <div aria-hidden className="absolute -right-4 -top-12 h-44 w-44 rounded-full border border-primary/15" />
        <div className="relative">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{dateLabel}</p>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            {greeting}, <span className="font-medium">{firstName}.</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              {ROLE_LABELS[role ?? ''] ?? role}
            </span>
            <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted">
              {DEPARTMENT_LABELS[profile?.department ?? ''] ?? profile?.department}
            </span>
          </div>
        </div>
      </section>

      {searchParams?.notice === 'no-access' && (
        <div className="panel flex items-center gap-3 p-4 text-sm text-muted">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          That page isn&rsquo;t part of your role, so you&rsquo;ve been brought back here.
        </div>
      )}

      {stats.length > 0 && (
        <section>
          <p className={SECTION}>At a glance</p>
          <div className={`grid grid-cols-2 gap-4 ${STAT_GRID[stats.length]}`}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="panel p-5 transition-colors hover:border-primary/40">
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                        stat.alert ? 'border-red-400/30 bg-red-400/10' : 'border-primary/25 bg-accent'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${stat.alert ? 'text-red-300' : 'text-primary'}`} />
                    </span>
                  </div>
                  <p className={`text-3xl font-semibold tracking-tight ${stat.alert ? 'text-red-300' : 'text-foreground'}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-9 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <p className={SECTION}>Needs your attention</p>
          {attention.length === 0 ? (
            <div className="panel flex items-center gap-3 p-5 text-sm text-muted">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              You&rsquo;re all caught up here. Nothing is waiting on you.
            </div>
          ) : (
            <ul className="panel divide-y divide-border overflow-hidden">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-4 px-5 py-4 text-sm text-foreground transition-colors hover:bg-surface-hover/40"
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {quickLinks.length > 0 && (
          <section className="lg:col-span-2">
            <p className={SECTION}>Quick links</p>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="panel group flex items-center justify-between gap-4 px-5 py-4 text-sm text-foreground transition-colors hover:border-primary/40"
                  >
                    {link.label}
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
