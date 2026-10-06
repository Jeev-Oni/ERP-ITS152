'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startTrip, arriveAtSite, confirmDelivery, closeTrip, rescheduleTrip } from '@/lib/actions/trucking-logistics';

export function TripActions({
  tripId,
  status,
  arrivedAt,
  isOwnDriver,
  isFleetSupervisor,
  isDispatcher,
}: {
  tripId: string;
  status: string;
  arrivedAt: string | null;
  isOwnDriver: boolean;
  isFleetSupervisor: boolean;
  isDispatcher: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [issueNote, setIssueNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<any>) {
    setPending(true);
    setMessage(null);
    const result = await action();
    setPending(false);
    if (result?.error) setMessage(result.error);
    if (result?.maintenanceScheduled) setMessage('Trip closed. Truck was due for maintenance — a job was scheduled.');
    router.refresh();
  }

  const actions: JSX.Element[] = [];

  if (isOwnDriver && status === 'dispatched') {
    actions.push(
      <button key="depart" onClick={() => run(() => startTrip(tripId))} disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        Depart Warehouse
      </button>
    );
  }

  if (isOwnDriver && status === 'en_route' && !arrivedAt) {
    actions.push(
      <button key="arrive" onClick={() => run(() => arriveAtSite(tripId))} disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        Mark Arrived at Client Site
      </button>
    );
  }

  if (isOwnDriver && status === 'en_route' && arrivedAt) {
    actions.push(
      <div key="confirm" className="w-full space-y-2 rounded border border-border p-3">
        <p className="text-sm text-foreground">Delivery Confirmed?</p>
        <input
          placeholder="Issue note (only needed if reporting a problem)"
          value={issueNote}
          onChange={(e) => setIssueNote(e.target.value)}
          className="w-full rounded px-2 py-1 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={() => run(() => confirmDelivery(tripId, true))}
            disabled={pending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white"
          >
            Yes — Confirmed
          </button>
          <button
            onClick={() => run(() => confirmDelivery(tripId, false, issueNote || undefined))}
            disabled={pending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
          >
            No — Report Issue
          </button>
        </div>
      </div>
    );
  }

  if (isFleetSupervisor && status === 'delivered') {
    actions.push(
      <button key="close" onClick={() => run(() => closeTrip(tripId))} disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
        Close Trip &amp; Check Maintenance
      </button>
    );
  }

  if (isDispatcher && status === 'delivery_failed') {
    actions.push(
      <button key="reschedule" onClick={() => run(() => rescheduleTrip(tripId))} disabled={pending} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-hover">
        Reschedule as New Trip
      </button>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4">
      {actions}
      {message && <p className="w-full text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
