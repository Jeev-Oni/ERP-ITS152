// Single source of truth for "which role can open which part of the app".
//
// It drives three things, so they can never drift apart:
//   1. the sidebar (SidebarNav hides links the role can't open),
//   2. the route guard (src/lib/supabase/middleware.ts redirects anyone who types the URL),
//   3. the dashboard's "At a glance" cards (see STAT_ACCESS below).
//
// The rule is "a role only sees what it can MANAGE", i.e. the roles that own a task on the
// BPMN flow or hold write access in the CRUD matrix (docs/ROLES_AND_PERMISSIONS.md). Roles
// that merely have read access via RLS (e.g. Management reading attendance) are
// intentionally NOT listed. Add a role to a list below to give it that page.
//
// system_admin is implicit everywhere. RLS in supabase/migrations is still the real data
// enforcement; this file only controls what the UI shows and which URLs open.
//
// No server-only imports here: this file is used from middleware (edge) and client code.

export type AppRole =
  | 'admin_staff'
  | 'hr_payroll_officer'
  | 'management'
  | 'finance'
  | 'warehouse_staff'
  | 'warehouse_supervisor'
  | 'dispatcher'
  | 'driver'
  | 'fleet_supervisor'
  | 'system_admin';

type RouteRule = { prefix: string; roles: AppRole[] };

export const ROUTE_ACCESS: RouteRule[] = [
  // HR & Administration
  { prefix: '/hr/employees', roles: ['hr_payroll_officer'] },
  { prefix: '/hr/attendance', roles: ['admin_staff', 'hr_payroll_officer'] },
  { prefix: '/hr/payroll', roles: ['hr_payroll_officer', 'management', 'finance'] }, // compute / approve / disburse
  { prefix: '/hr/payslips', roles: ['hr_payroll_officer'] },

  // Warehouse Operations
  { prefix: '/warehouse/items', roles: ['warehouse_staff', 'warehouse_supervisor'] },
  { prefix: '/warehouse/stock-movements', roles: ['warehouse_staff', 'warehouse_supervisor'] },
  { prefix: '/warehouse/storage-locations', roles: ['warehouse_staff', 'warehouse_supervisor'] },

  // Delivery & Logistics
  { prefix: '/logistics/dispatch', roles: ['dispatcher'] },
  { prefix: '/logistics/trips', roles: ['dispatcher', 'driver', 'fleet_supervisor'] },
  { prefix: '/logistics/trucks', roles: ['fleet_supervisor'] },
  { prefix: '/logistics/drivers', roles: ['fleet_supervisor'] },

  // Admin: System Admin only (empty list = nobody but the implicit system_admin)
  { prefix: '/admin', roles: [] },
];

// Anything under these sections that has no rule above is denied (fail closed), so a page
// added later stays locked until someone lists it deliberately.
const GUARDED_SECTIONS = ['/hr', '/warehouse', '/logistics', '/admin'];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** True when the path belongs to a section that needs a role check. */
export function isGuardedPath(pathname: string) {
  return GUARDED_SECTIONS.some((s) => matches(pathname, s));
}

/** Can this role open this path? Paths outside the guarded sections (e.g. "/") are open to any signed-in user. */
export function canAccess(role: string | null | undefined, pathname: string) {
  if (!isGuardedPath(pathname)) return true;
  if (role === 'system_admin') return true;
  if (!role) return false;
  const rule = ROUTE_ACCESS.find((r) => matches(pathname, r.prefix));
  return !!rule && (rule.roles as string[]).includes(role);
}

/**
 * Dashboard "At a glance" cards, and the roles that manage what each one counts. These
 * mirror the RLS read policies, so a card never shows a misleading 0 for a table the role
 * can't read.
 */
export const STAT_ACCESS = {
  payrollCutoffs: ['hr_payroll_officer', 'management', 'finance'],
  discrepancies: ['warehouse_supervisor'],
  tripsInTransit: ['dispatcher', 'fleet_supervisor'],
  activeTrucks: ['fleet_supervisor'],
} as const satisfies Record<string, readonly AppRole[]>;
