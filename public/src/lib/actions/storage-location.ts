'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { binSchema } from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

/** Storage Location Master (bin) creation — Warehouse Supervisor. */
export async function createStorageLocation(input: { bin_code: string; zone?: string; capacity?: number }): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('storage_locations').insert(input);
  if (error) return dbError(error, { duplicate: 'That bin code already exists.' });

  revalidatePath('/warehouse/storage-locations');
  return { success: true };
}

/**
 * "Check Existing Location Mapping" + "Location Already Assigned?" gateway.
 * A single lookup, not a status machine — matches the doc's note that this process
 * has the fewest handoffs of the four.
 */
export async function lookupLocation(itemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('item_location_map')
    .select('*, storage_locations(*)')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) return { error: error.message };
  return { assigned: !!data, location: data };
}

/** "Assign New Storage Location/Bin" + "Map Item to Location in Storage Master" — Warehouse Staff. */
export async function assignLocation(itemId: string, storageLocationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('item_location_map').upsert({
    item_id: itemId,
    storage_location_id: storageLocationId,
    assigned_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/warehouse/storage-locations');
  return { success: true };
}

/** Edit a bin in the Storage Location Master — Warehouse Supervisor. */
export async function updateStorageLocation(id: string, input: unknown): Promise<ActionResult> {
  const parsed = binSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('storage_locations')
    .update({ bin_code: parsed.data.bin_code, zone: parsed.data.zone ?? null, capacity: parsed.data.capacity ?? null })
    .eq('id', id)
    .select('id');
  if (error) return dbError(error, { duplicate: 'That bin code already exists.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/warehouse/storage-locations');
  return { success: true };
}

/** Delete a bin. Blocked by FK while any item is assigned to it or it has audit history. */
export async function deleteStorageLocation(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('storage_locations').delete().eq('id', id).select('id');
  if (error) {
    return dbError(error, { inUse: 'This bin still has items assigned or audit history. Move or unassign the items first.' });
  }
  if (!data?.length) return noRowsAffected();

  revalidatePath('/warehouse/storage-locations');
  return { success: true };
}

/** Clear an item's bin assignment (the item becomes "not yet located"). */
export async function unassignLocation(itemId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('item_location_map').delete().eq('item_id', itemId).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/warehouse/storage-locations');
  return { success: true };
}
