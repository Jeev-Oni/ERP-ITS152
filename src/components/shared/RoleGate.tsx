// Client-side visibility only — RLS in supabase/migrations/0007_rls_policies.sql is the
// real enforcement. This component just hides actions the current user's role can't
// perform, matching the role labeled on each BPMN task in the source document.
'use client';

type Role =
  | 'admin_staff' | 'hr_payroll_officer' | 'management' | 'finance'
  | 'warehouse_staff' | 'warehouse_supervisor'
  | 'dispatcher' | 'driver' | 'fleet_supervisor' | 'system_admin';

export function RoleGate({
  currentRole,
  allow,
  children,
}: {
  currentRole: Role;
  allow: Role[];
  children: React.ReactNode;
}) {
  if (!allow.includes(currentRole) && currentRole !== 'system_admin') return null;
  return <>{children}</>;
}
