import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/roles';
import { CreateItemForm } from '@/components/warehouse/CreateItemForm';
import { ItemRow } from '@/components/warehouse/ItemRow';

// Item/SKU Master — the shared reference table Warehouse Recording and Storage Location
// both build on.
export default async function ItemsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const canEdit = hasRole(profile?.role, ['warehouse_supervisor']);

  const { data: items } = await supabase.from('items').select('*').order('sku');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Item / SKU Master</h1>

      {canEdit && <CreateItemForm />}

      <table className="w-full text-sm">
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
            <ItemRow key={item.id} item={item} canEdit={canEdit} />
          ))}
          {(items ?? []).length === 0 && (
            <tr><td colSpan={6} className="py-4 text-muted-foreground">No items yet.</td></tr>
          )}
        </tbody>
      </table>
      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Balances can&apos;t be edited here. They change only when a stock movement is logged, which keeps the ledger accurate.
        </p>
      )}
    </div>
  );
}
