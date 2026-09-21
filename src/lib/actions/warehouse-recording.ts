'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * "Receive Raw Materials from Supplier" / "Pick Item for Outbound Order" — Warehouse Staff.
 * Both paths converge here; movement_type is the only branch (see
 * docs/process-flows/warehouse-recording.md). The balance update itself happens in the
 * apply_stock_movement() Postgres trigger (0004_warehouse_recording.sql) — the BPMN
 * diagram draws that as a System task, so it deliberately does NOT happen in this action.
 */
export async function recordMovement(input: {
  item_id: string;
  movement_type: 'receipt' | 'issue';
  quantity: number;
  reference_note?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('stock_movements')
    .insert({ ...input, logged_by: user.id, status: 'pending' })
    .select()
    .single();
  if (error) return { error: error.message };

  // Flip to 'logged' to fire the balance-update trigger.
  const { error: logError } = await supabase
    .from('stock_movements')
    .update({ status: 'logged' })
    .eq('id', data.id);
  if (logError) return { error: logError.message };

  revalidatePath('/warehouse/stock-movements');
  return { success: true };
}

/** "Entry Matches Physical Count?" gateway — Warehouse Supervisor. */
export async function verifyMovement(movementId: string, physicalCount: number) {
  const supabase = createClient();
  const { data: movement } = await supabase
    .from('stock_movements')
    .select('quantity')
    .eq('id', movementId)
    .single();

  const matches = movement?.quantity === physicalCount;
  const { error } = await supabase
    .from('stock_movements')
    .update({ status: matches ? 'verified' : 'discrepancy' })
    .eq('id', movementId);
  if (error) return { error: error.message };

  if (!matches) {
    await supabase.from('stock_discrepancies').insert({
      stock_movement_id: movementId,
      physical_count: physicalCount,
      system_count: movement?.quantity ?? 0,
    });
  }

  revalidatePath('/warehouse/stock-movements');
  return { success: true, matches };
}
