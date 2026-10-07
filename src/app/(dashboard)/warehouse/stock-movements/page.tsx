import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { RoleGate } from '@/components/shared/RoleGate';
import { RecordMovementForm } from '@/components/warehouse/RecordMovementForm';
import { StockMovementsTable } from '@/components/warehouse/StockMovementsTable';
import { hasRole } from '@/lib/roles';

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
      <PageHeader eyebrow="Warehouse Operations" title="Stock Movements" description="Every receipt and issue, logged once and then checked by the Supervisor." />

      <RoleGate currentRole={role as any} allow={['warehouse_staff']}>
        <RecordMovementForm items={(items as any) ?? []} />
      </RoleGate>

      <StockMovementsTable movements={(movements as any) ?? []} role={role} userId={user!.id} />

      {hasRole(role, ['warehouse_supervisor', 'warehouse_staff']) && (
        <p className="text-xs text-muted-foreground">
          Made a mistake? Delete the movement and log it again. If it had already changed the stock balance, the
          balance is put back automatically and the deletion is recorded in the audit log. Staff can delete their own
          entries until the Supervisor verifies them; the Supervisor can delete any.
        </p>
      )}
    </div>
  );
}
