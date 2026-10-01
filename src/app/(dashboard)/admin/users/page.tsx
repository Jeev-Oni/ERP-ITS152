import { createClient } from '@/lib/supabase/server';
import { UserRow } from '@/components/shared/UserRow';

// system_admin only — RLS (profiles_admin_read_all / profiles_admin_write,
// 0002_profiles_and_auth.sql) is the real gate: a non-admin querying this table only
// ever gets their own row back, regardless of what this page renders.
export default async function UsersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">User Management</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Name</th>
            <th>Role</th>
            <th>Department</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(profiles ?? []).map((p: any) => (
            <UserRow key={p.id} profile={p} isSelf={p.id === user!.id} />
          ))}
          {(profiles ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No users visible {'\u2014'} you may not have system_admin access.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
