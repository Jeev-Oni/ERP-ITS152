'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { rescheduleTrip } from '@/lib/actions/trucking-logistics';
import { StatusBadge } from '@/components/shared/StatusBadge';

type Trip = {
  id: string;
  client_name: string;
  destination_address: string;
  status: string;
  trucks?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
};

export function DispatchTripsList({ trips }: { trips: Trip[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleReschedule(id: string) {
    setPendingId(id);
    await rescheduleTrip(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <table className="w-full text-sm">
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
          <tr key={trip.id} className="border-b border-border">
            <td className="py-2">
              <Link href={`/logistics/trips/${trip.id}`} className="hover:text-primary">{trip.client_name}</Link>
            </td>
            <td className="text-muted-foreground">{trip.destination_address}</td>
            <td>{trip.trucks?.plate_number ?? '—'}</td>
            <td>{trip.drivers?.full_name ?? '—'}</td>
            <td><StatusBadge status={trip.status} /></td>
            <td>
              {trip.status === 'delivery_failed' && (
                <button
                  onClick={() => handleReschedule(trip.id)}
                  disabled={pendingId === trip.id}
                  className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover"
                >
                  Reschedule
                </button>
              )}
            </td>
          </tr>
        ))}
        {trips.length === 0 && (
          <tr><td colSpan={6} className="py-4 text-muted-foreground">No trips dispatched yet.</td></tr>
        )}
      </tbody>
    </table>
  );
}
