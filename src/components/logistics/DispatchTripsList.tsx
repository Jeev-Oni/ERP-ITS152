'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { rescheduleTrip, updateTrip, deleteTrip } from '@/lib/actions/trucking-logistics';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EditableRow, type Field } from '@/components/shared/EditableRow';

type Trip = {
  id: string;
  truck_id: string;
  driver_id: string;
  client_name: string;
  destination_address: string;
  status: string;
  trucks?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
};
type Option = { value: string; label: string };

// A trip the driver hasn't left with yet can still be amended or cancelled by the Dispatcher.
// After that it's part of the audit trail: a failed delivery is rescheduled as a NEW trip.
function TripRow({ trip, canEdit, truckOptions, driverOptions }: {
  trip: Trip; canEdit: boolean; truckOptions: Option[]; driverOptions: Option[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the current truck/driver selectable even if they've since been deactivated.
  const withCurrent = (opts: Option[], value: string, label?: string) =>
    opts.some((o) => o.value === value) ? opts : [...opts, { value, label: `${label ?? 'Unknown'} (inactive)` }];
  const fields: Field[] = [
    { name: 'client_name', type: 'text', required: true, width: 'w-40' },
    { name: 'destination_address', type: 'text', required: true, width: 'w-56', className: 'text-muted-foreground' },
    { name: 'truck_id', type: 'select', options: withCurrent(truckOptions, trip.truck_id, trip.trucks?.plate_number), width: 'w-32' },
    { name: 'driver_id', type: 'select', options: withCurrent(driverOptions, trip.driver_id, trip.drivers?.full_name), width: 'w-40' },
  ];

  async function handleReschedule() {
    setPending(true);
    setError(null);
    const result = await rescheduleTrip(trip.id);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <>
      <EditableRow
        fields={fields}
        values={{
          client_name: trip.client_name,
          destination_address: trip.destination_address,
          truck_id: trip.truck_id,
          driver_id: trip.driver_id,
        }}
        display={{
          client_name: <Link href={`/logistics/trips/${trip.id}`} className="hover:text-primary">{trip.client_name}</Link>,
        }}
        extraCells={<td><StatusBadge status={trip.status} /></td>}
        extraActions={
          canEdit && trip.status === 'delivery_failed' && (
            <button
              type="button"
              onClick={handleReschedule}
              disabled={pending}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover"
            >
              Reschedule
            </button>
          )
        }
        canEdit={canEdit && trip.status === 'dispatched'}
        deleteLabel="Cancel Trip"
        onSave={(v) => updateTrip(trip.id, v)}
        onDelete={() => deleteTrip(trip.id)}
      />
      {error && <tr><td colSpan={6} className="pb-2 text-xs text-red-400">{error}</td></tr>}
    </>
  );
}

export function DispatchTripsList({ trips, canEdit, trucks, drivers }: {
  trips: Trip[]; canEdit: boolean; trucks: Option[]; drivers: Option[];
}) {
  return (
    <div className="table-wrap">
<table className="data-table">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2">Client</th>
          <th>Destination</th>
          <th>Truck</th>
          <th>Driver</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {trips.map((trip) => (
          <TripRow key={trip.id} trip={trip} canEdit={canEdit} truckOptions={trucks} driverOptions={drivers} />
        ))}
        {trips.length === 0 && (
          <tr><td colSpan={6} className="py-4 text-muted-foreground">No trips dispatched yet.</td></tr>
        )}
      </tbody>
    </table>
</div>
  );
}
