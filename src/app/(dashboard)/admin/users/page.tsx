import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRow } from '@/components/shared/UserRow';
import { CreateUserForm } from '@/components/shared/CreateUserForm';
import { PageHeader } from '@/components/shared/PageHeader';

// system_admin only. RLS (profiles_admin_read_all / profiles_admin_write) is the real gate:
// a non-admin querying this table only ever gets their own row back, whatever this page renders.
export default async function UsersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');
  const isAdmin = (profiles ?? []).some((p: any) => p.id === user!.id && p.role === 'system_admin' && p.is_active);

  // Emails live in Supabase Auth, not in profiles, so an admin-only page reads them with the
  // service role. Only reached for a verified system_admin; a failure just hides the emails.
  const emails = new Map<string, string>();
  if (isAdmin) {
    try {
      const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
      data?.users.forEach((u) => u.email && emails.set(u.id, u.email));
    } catch (e) {
      console.error('Could not list auth users', e);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="User Management"
        description="Create accounts, set roles, change emails, set a new password for someone who is locked out, and deactivate people who leave."
      />

      {isAdmin && <CreateUserForm />}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr className="text-left">
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p: any) => (
              <UserRow key={p.id} profile={p} email={emails.get(p.id) ?? null} isSelf={p.id === user!.id} />
            ))}
            {(profiles ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-muted-foreground">No users visible {'\u2014'} you may not have system_admin access.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
