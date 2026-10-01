import { createClient } from '@/lib/supabase/server';
import { RoleGate } from '@/components/shared/RoleGate';
import { CreateStorageLocationForm } from '@/components/warehouse/CreateStorageLocationForm';
import { AssignLocationTool } from '@/components/warehouse/AssignLocationTool';

// Storage Location — deliberately the leanest module: one lookup/assign decision,
// no status machine (see docs/process-flows/storage-location.md).
export default async function StorageLocationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: items } = await supabase.from('items').select('id, sku, name').order('sku');
  const { data: bins } = await supabase.from('storage_locations').select('*').order('bin_code');
  const { data: assignments } = await supabase
    .from('item_location_map')
    .select('*, items(sku, name), storage_locations(bin_code, zone)')
    .order('assigned_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Storage Locations</h1>

      <RoleGate currentRole={role as any} allow={['warehouse_supervisor']}>
        <CreateStorageLocationForm />
      </RoleGate>

      <RoleGate currentRole={role as any} allow={['warehouse_staff']}>
        <AssignLocationTool items={(items as any) ?? []} bins={(bins as any) ?? []} />
      </RoleGate>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Current Assignments</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Item</th>
              <th>Bin</th>
              <th>Zone</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {(assignments ?? []).map((a: any) => (
              <tr key={a.id} className="border-b border-border">
                <td className="py-2">{a.items?.sku} — {a.items?.name}</td>
                <td className="text-primary">{a.storage_locations?.bin_code}</td>
                <td className="text-muted-foreground">{a.storage_locations?.zone ?? '—'}</td>
                <td className="text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(assignments ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-4 text-muted-foreground">No items assigned to bins yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
