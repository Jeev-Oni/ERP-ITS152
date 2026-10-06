// UI-level role check, mirroring RoleGate. RLS (supabase/migrations) is the real enforcement;
// this only decides which edit/delete controls to render.
export function hasRole(role: string | undefined | null, allow: string[]) {
  return role === 'system_admin' || (!!role && allow.includes(role));
}
