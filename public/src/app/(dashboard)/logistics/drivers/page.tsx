import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/roles';
import { CreateDriverForm } from '@/components/logistics/CreateDriverForm';
import { DriverRow } from '@/components/logistics/DriverRow';

// Driver roster. Fleet Supervisor manages it; Dispatcher can read it (RLS: drivers_read).
// A driver can only see and update their own trips once the roster entry is linked to their
// login account, which is why System Admin gets a "Login" picker here.
export default async function DriversPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;
  const canEdit = hasRole(role, ['fleet_supervisor']);

  const { data: drivers } = await supabase.from('drivers').select('*').order('full_name');

  // Only System Admin can list profiles (profiles RLS), so only they get the link picker.
  let loginOptions: { value: string; label: string }[] | undefined;
  if (role === 'system_admin') {
    const { data: driverProfiles } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver').order('full_name');
    loginOptions = (driverProfiles ?? []).map((p: any) => ({ value: p.id, label: p.full_name }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Drivers</h1>

      {canEdit && <CreateDriverForm />}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Name</th>
            <th>License No.</th>
            <th>Login Account</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(drivers ?? []).map((d: any) => (
            <DriverRow key={d.id} driver={d} canEdit={canEdit} loginOptions={loginOptions} />
          ))}
          {(drivers ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No drivers yet.</td></tr>
          )}
        </tbody>
      </table>
      {role === 'system_admin' && (
        <p className="text-xs text-muted-foreground">
          Link each driver to their login so they can see and update their own trips.
          Create the login first under User Management, with the Driver role.
        </p>
      )}
    </div>
  );
}
