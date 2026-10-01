import { createClient } from '@/lib/supabase/server';
import { RoleGate } from '@/components/shared/RoleGate';
import { RecordMovementForm } from '@/components/warehouse/RecordMovementForm';
import { StockMovementsTable } from '@/components/warehouse/StockMovementsTable';

// Warehouse Recording — receipts and issues converge on one log, verified by the
// supervisor before the audit trail closes (docs/process-flows/warehouse-recording.md).
export default async function StockMovementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: items } = await supabase.from('items').select('id, sku, name').order('sku');
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('*, items(sku, name), stock_discrepancies(id, physical_count, system_count, resolved_at)')
    .order('logged_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Stock Movements</h1>

      <RoleGate currentRole={role as any} allow={['warehouse_staff']}>
        <RecordMovementForm items={(items as any) ?? []} />
      </RoleGate>

      <StockMovementsTable movements={(movements as any) ?? []} role={role} />
    </div>
  );
}
