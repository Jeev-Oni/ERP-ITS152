'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTruck } from '@/lib/actions/trucking-logistics';

export function CreateTruckForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const capacity = formData.get('capacity_kg') as string;
    const result = await createTruck({
      plate_number: formData.get('plate_number') as string,
      model: (formData.get('model') as string) || undefined,
      capacity_kg: capacity ? Number(capacity) : undefined,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <label className="block text-xs text-muted-foreground">Plate Number</label>
        <input name="plate_number" required placeholder="GHI-9012" className="w-32 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Model</label>
        <input name="model" placeholder="Isuzu Elf" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Capacity (kg)</label>
        <input name="capacity_kg" type="number" step="0.01" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Adding…' : 'Add Truck'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
