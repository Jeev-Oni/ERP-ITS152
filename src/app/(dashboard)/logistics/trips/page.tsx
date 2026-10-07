import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Trips a driver sees are scoped to their own assignments; everyone else sees the full
// board — mirrors how the swimlane diagram gives Driver a narrower lane than Dispatcher.
export default async function TripsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = profile?.role as string | undefined;

  let query = supabase
    .from('trips')
    .select('id, client_name, destination_address, status, dispatched_at, trucks(plate_number), drivers(full_name, profile_id)')
    .order('dispatched_at', { ascending: false });

  if (role === 'driver') {
    const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', user!.id).maybeSingle();
    query = driver ? query.eq('driver_id', driver.id) : query.eq('driver_id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: trips } = await query.limit(50);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery & Logistics"
        title={role === 'driver' ? 'Your Trips' : 'Trips'}
        description={
          role === 'driver'
            ? 'Trips assigned to you. Start a trip, then confirm each delivery on site.'
            : 'Every trip from dispatch to delivery confirmation and close-out.'
        }
      />
      <div className="table-wrap">
<table className="data-table">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Client</th>
            <th>Destination</th>
            <th>Truck</th>
            <th>Driver</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(trips ?? []).map((trip: any) => (
            <tr key={trip.id} className="border-b border-border">
              <td className="py-2">
                <Link href={`/logistics/trips/${trip.id}`} className="hover:text-primary">{trip.client_name}</Link>
              </td>
              <td className="text-muted-foreground">{trip.destination_address}</td>
              <td>{trip.trucks?.plate_number ?? '—'}</td>
              <td>{trip.drivers?.full_name ?? '—'}</td>
              <td><StatusBadge status={trip.status} /></td>
            </tr>
          ))}
          {(trips ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No trips to show.</td></tr>
          )}
        </tbody>
      </table>
</div>
    </div>
  );
}
