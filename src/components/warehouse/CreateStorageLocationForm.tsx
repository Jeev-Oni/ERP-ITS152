'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStorageLocation } from '@/lib/actions/storage-location';

export function CreateStorageLocationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const capacity = formData.get('capacity') as string;
    const result = await createStorageLocation({
      bin_code: formData.get('bin_code') as string,
      zone: (formData.get('zone') as string) || undefined,
      capacity: capacity ? Number(capacity) : undefined,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Bin Code</label>
        <input name="bin_code" required placeholder="A1-03" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Zone</label>
        <input name="zone" placeholder="Zone A" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Capacity</label>
        <input name="capacity" type="number" step="0.01" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Adding…' : 'Add Bin'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
