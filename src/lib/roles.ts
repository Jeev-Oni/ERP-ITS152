// UI-level role check, mirroring RoleGate. RLS (supabase/migrations) is the real enforcement;
// this only decides which edit/delete controls to render.
export function hasRole(role: string | undefined | null, allow: string[]) {
  return role === 'system_admin' || (!!role && allow.includes(role));
}

const LABELS: Record<string, string> = {
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

export function roleLabel(role: string | undefined | null) {
  return (role && LABELS[role]) || role || 'an unknown role';
}
