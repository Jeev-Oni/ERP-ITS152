'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createItem } from '@/lib/actions/warehouse-recording';

// Item/SKU Master entry point — Warehouse Supervisor.
export function CreateItemForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const reorderPoint = formData.get('reorder_point') as string;
    const result = await createItem({
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      reorder_point: reorderPoint ? Number(reorderPoint) : undefined,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">SKU</label>
        <input name="sku" required placeholder="CORN-002" className="w-32 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Name</label>
        <input name="name" required placeholder="Yellow Corn" className="w-48 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Unit</label>
        <input name="unit" required placeholder="kg" className="w-20 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Reorder Point</label>
        <input name="reorder_point" type="number" step="0.01" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Adding…' : 'Add Item'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
