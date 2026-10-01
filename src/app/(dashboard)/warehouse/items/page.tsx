import { createClient } from '@/lib/supabase/server';
import { RoleGate } from '@/components/shared/RoleGate';
import { CreateItemForm } from '@/components/warehouse/CreateItemForm';

// Item/SKU Master — the shared reference table Warehouse Recording and Storage Location
// both build on.
export default async function ItemsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: items } = await supabase.from('items').select('*').order('sku');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Item / SKU Master</h1>

      <RoleGate currentRole={role as any} allow={['warehouse_supervisor']}>
        <CreateItemForm />
      </RoleGate>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">SKU</th>
            <th>Name</th>
            <th>Unit</th>
            <th>Current Balance</th>
            <th>Reorder Point</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item: any) => (
            <tr key={item.id} className="border-b border-border">
              <td className="py-2 font-mono text-xs">{item.sku}</td>
              <td>{item.name}</td>
              <td>{item.unit}</td>
              <td className={item.reorder_point && item.current_balance <= item.reorder_point ? 'text-red-400' : ''}>
                {item.current_balance}
              </td>
              <td>{item.reorder_point ?? '—'}</td>
            </tr>
          ))}
          {(items ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No items yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
