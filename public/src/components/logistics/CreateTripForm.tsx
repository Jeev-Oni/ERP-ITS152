'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTrip } from '@/lib/actions/trucking-logistics';

type Truck = { id: string; plate_number: string };
type Driver = { id: string; full_name: string };

// "Plan Route & Assign Truck/Driver" + "Generate Digital Trip Ticket" — Dispatcher.
export function CreateTripForm({ trucks, drivers }: { trucks: Truck[]; drivers: Driver[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createTrip({
      truck_id: formData.get('truck_id') as string,
      driver_id: formData.get('driver_id') as string,
      client_name: formData.get('client_name') as string,
      destination_address: formData.get('destination_address') as string,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <label className="block text-xs text-muted-foreground">Truck</label>
        <select name="truck_id" required className="w-32 rounded px-2 py-1 text-sm">
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>{t.plate_number}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Driver</label>
        <select name="driver_id" required className="w-40 rounded px-2 py-1 text-sm">
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Client</label>
        <input name="client_name" required className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Destination</label>
        <input name="destination_address" required className="w-56 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Dispatching…' : 'Dispatch Trip'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
