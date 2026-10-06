'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  driverSchema,
  maintenanceDateSchema,
  truckSchema,
  tripUpdateSchema,
} from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

/** Delivery-Asset (Truck) Master creation — Fleet Supervisor. */
export async function createTruck(input: {
  plate_number: string;
  model?: string;
  capacity_kg?: number;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('trucks').insert(input);
  if (error) return dbError(error, { duplicate: 'A truck with that plate number already exists.' });

  revalidatePath('/logistics/trucks');
  return { success: true };
}

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

/** "Driver Departs Warehouse" — Driver. */
export async function startTrip(tripId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('trips')
    .update({ status: 'en_route', departed_at: new Date().toISOString() })
    .eq('id', tripId);
  if (error) return { error: error.message };

  revalidatePath(`/logistics/trips/${tripId}`);
  revalidatePath('/logistics/trips');
  return { success: true };
}

/**
 * "Arrive at Client Site" — Driver. No status change (the doc draws this as a plain
 * step between en_route and the Delivery Confirmed? gateway) — just timestamps arrival
 * so dispatch can see the driver is on-site.
 */
export async function arriveAtSite(tripId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('trips')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', tripId);
  if (error) return { error: error.message };

  revalidatePath(`/logistics/trips/${tripId}`);
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

/**
 * "Update Trip & Maintenance Log" + "Truck Due for Maintenance?" gateway — Fleet Supervisor.
 * Closes the trip, then checks the truck's next_maintenance_due date: if it's today or
 * already past, this auto-creates a maintenance_schedule row instead of leaving it to a
 * separate manual step, matching the doc's gateway running as part of the same task.
 */
export async function closeTrip(tripId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: trip, error: fetchError } = await supabase
    .from('trips')
    .select('truck_id')
    .eq('id', tripId)
    .single();
  if (fetchError || !trip) return { error: fetchError?.message ?? 'Trip not found' };

  const { error: closeError } = await supabase
    .from('trips')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', tripId);
  if (closeError) return { error: closeError.message };

  const today = new Date().toISOString().slice(0, 10);
  const { data: truck } = await supabase
    .from('trucks')
    .select('next_maintenance_due')
    .eq('id', trip.truck_id)
    .single();

  let maintenanceScheduled = false;
  if (truck?.next_maintenance_due && truck.next_maintenance_due <= today) {
    const { error: maintError } = await supabase.from('maintenance_schedule').insert({
      truck_id: trip.truck_id,
      trip_id: tripId,
      scheduled_date: today,
      scheduled_by: user.id,
    });
    if (maintError) return { error: maintError.message };
    maintenanceScheduled = true;
  }

  revalidatePath('/logistics/trips');
  revalidatePath('/logistics/trucks');
  return { success: true, maintenanceScheduled };
}

/** Manual "Schedule Fleet Maintenance" — Fleet Supervisor, outside the auto-check in closeTrip(). */
export async function scheduleMaintenance(truckId: string, scheduledDate: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('maintenance_schedule').insert({
    truck_id: truckId,
    scheduled_date: scheduledDate,
    scheduled_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/logistics/trucks');
  return { success: true };
}

/** Marks a maintenance job done and rolls the truck's maintenance dates forward. */
export async function completeMaintenance(maintenanceId: string) {
  const supabase = createClient();
  const { data: job, error: fetchError } = await supabase
    .from('maintenance_schedule')
    .select('truck_id, scheduled_date')
    .eq('id', maintenanceId)
    .single();
  if (fetchError || !job) return { error: fetchError?.message ?? 'Maintenance job not found' };

  const { error: jobError } = await supabase
    .from('maintenance_schedule')
    .update({ status: 'completed' })
    .eq('id', maintenanceId);
  if (jobError) return { error: jobError.message };

  // 90-day interval is a placeholder company policy, not a manufacturer spec — adjust
  // per truck/fleet maintenance schedule.
  const nextDue = new Date(job.scheduled_date);
  nextDue.setDate(nextDue.getDate() + 90);

  const { error: truckError } = await supabase
    .from('trucks')
    .update({ last_maintenance_date: job.scheduled_date, next_maintenance_due: nextDue.toISOString().slice(0, 10) })
    .eq('id', job.truck_id);
  if (truckError) return { error: truckError.message };

  revalidatePath('/logistics/trucks');
  return { success: true };
}

// ============================================================
// Truck Master — Fleet Supervisor (RLS: trucks_write_fleet_supervisor)
// ============================================================

export async function updateTruck(id: string, input: unknown): Promise<ActionResult> {
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('trucks')
    .update({
      plate_number: parsed.data.plate_number,
      model: parsed.data.model ?? null,
      capacity_kg: parsed.data.capacity_kg ?? null,
      // closeTrip() compares this date to today to auto-schedule maintenance.
      next_maintenance_due: parsed.data.next_maintenance_due ?? null,
    })
    .eq('id', id)
    .select('id');
  if (error) return dbError(error, { duplicate: 'A truck with that plate number already exists.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/trucks');
  return { success: true };
}

/** Soft-retire a truck: it disappears from the dispatch dropdown but its trip history stays. */
export async function setTruckActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('trucks').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/trucks');
  revalidatePath('/logistics/dispatch');
  return { success: true };
}

export async function deleteTruck(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('trucks').delete().eq('id', id).select('id');
  if (error) {
    return dbError(error, { inUse: 'This truck has trip or maintenance history. Deactivate it instead of deleting.' });
  }
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/trucks');
  return { success: true };
}

// ============================================================
// Driver roster — Fleet Supervisor (RLS: drivers_write_fleet_supervisor)
// ============================================================

export async function createDriver(input: unknown): Promise<ActionResult> {
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { error } = await supabase
    .from('drivers')
    .insert({ full_name: parsed.data.full_name, license_number: parsed.data.license_number ?? null });
  if (error) return dbError(error);

  revalidatePath('/logistics/drivers');
  return { success: true };
}

export async function updateDriver(id: string, input: unknown): Promise<ActionResult> {
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('drivers')
    .update({ full_name: parsed.data.full_name, license_number: parsed.data.license_number ?? null })
    .eq('id', id)
    .select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/drivers');
  return { success: true };
}

export async function setDriverActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('drivers').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/drivers');
  revalidatePath('/logistics/dispatch');
  return { success: true };
}

export async function deleteDriver(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('drivers').delete().eq('id', id).select('id');
  if (error) return dbError(error, { inUse: 'This driver has trip history. Deactivate them instead of deleting.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/drivers');
  return { success: true };
}

/**
 * Links a roster driver to their login account. Without this link the driver cannot see or
 * update their own trips. Only system_admin can list profiles (profiles RLS), so only they
 * can call this meaningfully.
 */
export async function linkDriverLogin(driverId: string, profileId: string | null): Promise<ActionResult> {
  const supabase = createClient();

  if (profileId) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', profileId).maybeSingle();
    if (!profile) return { error: 'That user account was not found.' };
    if (profile.role !== 'driver') return { error: 'That account does not have the Driver role.' };
  }

  const { data, error } = await supabase.from('drivers').update({ profile_id: profileId }).eq('id', driverId).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/logistics/drivers');
  return { success: true };
}

// ============================================================
// Trips — Dispatcher may amend/cancel only while still 'dispatched' (before departure).
// ============================================================

export async function updateTrip(id: string, input: unknown): Promise<ActionResult> {
  const parsed = tripUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('trips')
    .update(parsed.data)
    .eq('id', id)
    .eq('status', 'dispatched')
    .select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected('Only a trip that has not departed yet can be edited.');

  revalidatePath('/logistics/dispatch');
  revalidatePath('/logistics/trips');
  return { success: true };
}

/** Cancels (removes) a trip that has not departed. Trips already underway are part of the audit trail. */
export async function deleteTrip(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('trips').delete().eq('id', id).eq('status', 'dispatched').select('id');
  if (error) return dbError(error, { inUse: 'A rescheduled trip points back to this one, so it cannot be removed.' });
  if (!data?.length) return noRowsAffected('Only a trip that has not departed yet can be cancelled.');

  revalidatePath('/logistics/dispatch');
  revalidatePath('/logistics/trips');
  return { success: true };
}

// ============================================================
// Maintenance schedule — Fleet Supervisor
// ============================================================

export async function updateMaintenanceDate(id: string, input: unknown): Promise<ActionResult> {
  const parsed = maintenanceDateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .update({ scheduled_date: parsed.data.scheduled_date })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected('Only a scheduled job can be rescheduled.');

  revalidatePath('/logistics/trucks');
  return { success: true };
}

export async function cancelMaintenance(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected('Only a scheduled job can be cancelled.');

  revalidatePath('/logistics/trucks');
  return { success: true };
}

/** Removes a cancelled job from the list. Completed jobs are kept as maintenance history. */
export async function deleteMaintenance(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .delete()
    .eq('id', id)
    .eq('status', 'cancelled')
    .select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected('Only a cancelled job can be deleted.');

  revalidatePath('/logistics/trucks');
  return { success: true };
}
