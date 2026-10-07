import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasRole } from '@/lib/roles';
import { CreateItemForm } from '@/components/warehouse/CreateItemForm';
import { ItemRow } from '@/components/warehouse/ItemRow';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';

// Item/SKU Master — the shared reference table Warehouse Recording and Storage Location
// both build on.
export default async function ItemsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;
  const canEdit = hasRole(role, ['warehouse_staff', 'warehouse_supervisor']); // fix SKU / name / unit / reorder point
  const canManage = hasRole(role, ['warehouse_supervisor']); // add and delete items

  const { data: items } = await supabase.from('items').select('*').order('sku');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Warehouse Operations" title="Item / SKU Master" description="Every item the warehouse handles, with its live stock balance." />
      {!canEdit && <ReadOnlyNotice role={role} who="Warehouse Staff and Warehouse Supervisor" />}

      {canManage && <CreateItemForm />}

      <div className="table-wrap">
<table className="data-table">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">SKU</th>
            <th>Name</th>
            <th>Unit</th>
            <th>Current Balance</th>
            <th>Reorder Point</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item: any) => (
            <ItemRow key={item.id} item={item} canEdit={canEdit} canDelete={canManage} />
          ))}
          {(items ?? []).length === 0 && (
            <tr><td colSpan={6} className="py-4 text-muted-foreground">No items yet.</td></tr>
          )}
        </tbody>
      </table>
</div>
      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Balances can&apos;t be typed in. They change only when a stock movement is logged (or deleted), which keeps the ledger accurate. Adding and deleting items is done by the Warehouse Supervisor.
        </p>
      )}
    </div>
  );
}
