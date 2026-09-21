'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
