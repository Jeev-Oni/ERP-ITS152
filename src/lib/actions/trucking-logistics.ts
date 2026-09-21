'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** "Plan Route & Assign Truck/Driver" + "Generate Digital Trip Ticket" — Dispatcher. */
export async function createTrip(input: {
  truck_id: string;
  driver_id: string;
  client_name: string;
  destination_address: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('trips')
    .insert({ ...input, dispatched_by: user.id, status: 'dispatched' });
  if (error) return { error: error.message };

  revalidatePath('/logistics/dispatch');
  return { success: true };
}

/** "Delivery Confirmed?" gateway — Driver / Client. */
export async function confirmDelivery(tripId: string, confirmed: boolean, issueNote?: string) {
  const supabase = createClient();

  await supabase.from('delivery_confirmations').insert({
    trip_id: tripId,
    confirmed,
    issue_note: issueNote,
  });

  const { error } = await supabase
    .from('trips')
    .update({ status: confirmed ? 'delivered' : 'delivery_failed' })
    .eq('id', tripId);
  if (error) return { error: error.message };

  revalidatePath(`/logistics/trips/${tripId}`);
  return { success: true };
}

/**
 * "Report Issue & Reschedule Trip" — Dispatcher.
 * Per the source doc, a rescheduled trip is "a new trip instance," never a mutation
 * of the failed one — so this inserts a new row rather than updating the old trip.
 */
export async function rescheduleTrip(failedTripId: string) {
  const supabase = createClient();
  const { data: failedTrip, error: fetchError } = await supabase
    .from('trips')
    .select('truck_id, driver_id, client_name, destination_address, dispatched_by')
    .eq('id', failedTripId)
    .single();
  if (fetchError || !failedTrip) return { error: fetchError?.message ?? 'Trip not found' };

  const { error } = await supabase.from('trips').insert({
    ...failedTrip,
    status: 'dispatched',
    rescheduled_from_trip_id: failedTripId,
  });
  if (error) return { error: error.message };

  revalidatePath('/logistics/dispatch');
  return { success: true };
}
