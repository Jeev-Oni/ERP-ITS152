'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { itemUpdateSchema } from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

/** Item/SKU Master creation — Warehouse Supervisor (RLS: items_write_supervisor). */
export async function createItem(input: {
  sku: string;
  name: string;
  unit: string;
  reorder_point?: number;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('items').insert(input);
  if (error) return dbError(error, { duplicate: 'That SKU already exists.' });

  revalidatePath('/warehouse/items');
  return { success: true };
}

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

/**
 * "Investigate & Correct Discrepancy" — Warehouse Supervisor.
 * Closes out the discrepancy row and flips the movement back to 'verified', matching
 * the doc's "Supervisor Verifies & Closes Audit Trail" outcome regardless of which
 * path (clean match or resolved discrepancy) the movement took to get there.
 */
export async function resolveDiscrepancy(discrepancyId: string, resolutionNote: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: discrepancy, error: fetchError } = await supabase
    .from('stock_discrepancies')
    .select('stock_movement_id')
    .eq('id', discrepancyId)
    .single();
  if (fetchError || !discrepancy) return { error: fetchError?.message ?? 'Discrepancy not found' };

  const { error: resolveError } = await supabase
    .from('stock_discrepancies')
    .update({ resolution_note: resolutionNote, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', discrepancyId);
  if (resolveError) return { error: resolveError.message };

  const { error: statusError } = await supabase
    .from('stock_movements')
    .update({ status: 'verified' })
    .eq('id', discrepancy.stock_movement_id);
  if (statusError) return { error: statusError.message };

  revalidatePath('/warehouse/stock-movements');
  return { success: true };
}

/**
 * Edit Item/SKU master data — Warehouse Supervisor.
 * current_balance is deliberately NOT editable here (nor at the DB level: column privileges
 * only allow sku/name/unit/reorder_point). Balances change only through logged stock
 * movements, so the ledger can never drift.
 */
export async function updateItem(id: string, input: unknown): Promise<ActionResult> {
  const parsed = itemUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('items')
    .update({
      sku: parsed.data.sku,
      name: parsed.data.name,
      unit: parsed.data.unit,
      reorder_point: parsed.data.reorder_point ?? null,
    })
    .eq('id', id)
    .select('id');
  if (error) return dbError(error, { duplicate: 'That SKU already exists.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/warehouse/items');
  return { success: true };
}

/** Delete an item with no stock and no movement history (FKs block the rest). */
export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data: item, error: fetchError } = await supabase.from('items').select('current_balance').eq('id', id).single();
  if (fetchError || !item) return { error: fetchError?.message ?? 'Item not found' };
  if (Number(item.current_balance) !== 0) {
    return { error: 'This item still has stock on hand. Issue the remaining stock out before deleting it.' };
  }

  const { data, error } = await supabase.from('items').delete().eq('id', id).select('id');
  if (error) return dbError(error, { inUse: 'This item has stock movement history, so it cannot be deleted.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/warehouse/items');
  return { success: true };
}
