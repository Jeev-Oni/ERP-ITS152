import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasRole } from '@/lib/roles';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';
import { CreateStorageLocationForm } from '@/components/warehouse/CreateStorageLocationForm';
import { AssignLocationTool } from '@/components/warehouse/AssignLocationTool';
import { BinRow } from '@/components/warehouse/BinRow';
import { UnassignButton } from '@/components/warehouse/UnassignButton';

// Storage Location — deliberately the leanest module: one lookup/assign decision,
// no status machine (see docs/process-flows/storage-location.md).
export default async function StorageLocationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;
  const canManageBins = hasRole(role, ['warehouse_supervisor']);
  const canAssign = hasRole(role, ['warehouse_staff']);
  const canUnassign = hasRole(role, ['warehouse_staff', 'warehouse_supervisor']);

  const { data: items } = await supabase.from('items').select('id, sku, name').order('sku');
  const { data: bins } = await supabase.from('storage_locations').select('*').order('bin_code');
  const { data: assignments } = await supabase
    .from('item_location_map')
    .select('*, items(sku, name), storage_locations(bin_code, zone)')
    .order('assigned_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Warehouse Operations" title="Storage Locations" description="Where each item lives, so stock is found by bin code instead of memory." />
      {!canManageBins && !canAssign && <ReadOnlyNotice role={role} who="Warehouse Supervisor (bins) and Warehouse Staff (assigning items to bins)" />}

      {canManageBins && <CreateStorageLocationForm />}
      {canAssign && <AssignLocationTool items={(items as any) ?? []} bins={(bins as any) ?? []} />}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Bins</p>
        <div className="table-wrap">
<table className="data-table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Bin Code</th>
              <th>Zone</th>
              <th>Capacity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(bins ?? []).map((bin: any) => (
              <BinRow key={bin.id} bin={bin} canEdit={canManageBins} />
            ))}
            {(bins ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-4 text-muted-foreground">No bins yet.</td></tr>
            )}
          </tbody>
        </table>
</div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Current Assignments</p>
        <div className="table-wrap">
<table className="data-table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Item</th>
              <th>Bin</th>
              <th>Zone</th>
              <th>Assigned</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(assignments ?? []).map((a: any) => (
              <tr key={a.id} className="border-b border-border align-top">
                <td className="py-2">{a.items?.sku} — {a.items?.name}</td>
                <td className="text-primary">{a.storage_locations?.bin_code}</td>
                <td className="text-muted-foreground">{a.storage_locations?.zone ?? '—'}</td>
                <td className="text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString()}</td>
                <td>{canUnassign && <UnassignButton itemId={a.item_id} />}</td>
              </tr>
            ))}
            {(assignments ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-4 text-muted-foreground">No items assigned to bins yet.</td></tr>
            )}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}
