import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

export default async function DashboardHome() {
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

  // --- At a Glance: same four numbers for everyone, a company-wide pulse. ---
  const [activeCutoffs, unresolvedDiscrepancies, tripsInTransit, activeTrucks] = await Promise.all([
    supabase.from('payroll_cutoffs').select('id', { count: 'exact', head: true }).neq('status', 'disbursed'),
    supabase.from('stock_discrepancies').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['dispatched', 'en_route']),
    supabase.from('trucks').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const stats = [
    { label: 'Active Payroll Cutoffs', value: activeCutoffs.count ?? 0 },
    { label: 'Unresolved Discrepancies', value: unresolvedDiscrepancies.count ?? 0 },
    { label: 'Trips In Transit', value: tripsInTransit.count ?? 0 },
    { label: 'Active Trucks', value: activeTrucks.count ?? 0 },
  ];

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {profile?.full_name ?? 'there'}</h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[role ?? ''] ?? role} {'\u00b7'} {DEPARTMENT_LABELS[profile?.department ?? ''] ?? profile?.department}
        </p>
      </div>

      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-primary">At a Glance</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-border bg-surface p-4">
              <p className="text-2xl font-semibold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-primary">Needs Your Attention</p>
        {attention.length === 0 ? (
          <div className="rounded border border-border bg-surface p-4 text-sm text-muted-foreground">
            You&rsquo;re all caught up here.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded border border-border bg-surface">
            {attention.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  {item.label}
                  <span className="text-primary">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {quickLinks.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-primary">Quick Links</p>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
