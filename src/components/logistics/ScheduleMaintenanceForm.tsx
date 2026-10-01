'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleMaintenance } from '@/lib/actions/trucking-logistics';

type Truck = { id: string; plate_number: string };

export function ScheduleMaintenanceForm({ trucks }: { trucks: Truck[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await scheduleMaintenance(formData.get('truck_id') as string, formData.get('scheduled_date') as string);
    setPending(false);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <label className="block text-xs text-muted-foreground">Truck</label>
        <select name="truck_id" required className="w-36 rounded px-2 py-1 text-sm">
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>{t.plate_number}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Date</label>
        <input name="scheduled_date" type="date" required className="rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-hover">
        {pending ? 'Scheduling…' : 'Schedule Maintenance'}
      </button>
    </form>
  );
}
