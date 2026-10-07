import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BackLink } from '@/components/shared/BackLink';
import { PageHeader } from '@/components/shared/PageHeader';
import { TripActions } from '@/components/logistics/TripActions';

// One trip end to end: dispatched -> en_route -> delivered/delivery_failed -> closed,
// the full state machine from docs/process-flows/trucking-logistics.md.
export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = profile?.role as string | undefined;

  const { data: trip } = await supabase
    .from('trips')
    .select('*, trucks(plate_number, model), drivers(full_name, profile_id)')
    .eq('id', params.id)
    .single();

  if (!trip) return <p>Trip not found.</p>;

  const { data: confirmations } = await supabase
    .from('delivery_confirmations')
    .select('*')
    .eq('trip_id', params.id)
    .order('confirmed_at', { ascending: false });

  const isOwnDriver = role === 'driver' && (trip as any).drivers?.profile_id === user!.id;

  return (
    <div className="space-y-6">
      <BackLink href="/logistics/trips" label="Back to Trips" />

      <PageHeader
        eyebrow="Trip"
        title={trip.client_name}
        description={trip.destination_address}
        actions={<StatusBadge status={trip.status} />}
      />

      <div className="grid grid-cols-2 gap-4 panel p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Truck</p>
          <p className="text-foreground">{(trip as any).trucks?.plate_number ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Driver</p>
          <p className="text-foreground">{(trip as any).drivers?.full_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Departed</p>
          <p className="text-foreground">{trip.departed_at ? new Date(trip.departed_at).toLocaleString() : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Arrived</p>
          <p className="text-foreground">{trip.arrived_at ? new Date(trip.arrived_at).toLocaleString() : '—'}</p>
        </div>
      </div>

      <TripActions
        tripId={trip.id}
        status={trip.status}
        arrivedAt={trip.arrived_at}
        isOwnDriver={isOwnDriver}
        isFleetSupervisor={role === 'fleet_supervisor'}
        isDispatcher={role === 'dispatcher'}
      />

      {confirmations && confirmations.length > 0 && (
        <div className="panel p-5 text-sm">
          <p className="mb-2 font-medium text-foreground">Delivery Confirmation History</p>
          <ul className="space-y-1 text-muted-foreground">
            {confirmations.map((c) => (
              <li key={c.id}>
                {c.confirmed ? 'Confirmed' : `Issue reported: ${c.issue_note ?? 'no note'}`} — {new Date(c.confirmed_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
