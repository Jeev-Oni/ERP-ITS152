'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordMovement } from '@/lib/actions/warehouse-recording';

type Item = { id: string; sku: string; name: string };

// Both "Receive..." and "Pick..." converge on this one form — movement_type is the only
// branch, matching docs/process-flows/warehouse-recording.md.
export function RecordMovementForm({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await recordMovement({
      item_id: formData.get('item_id') as string,
      movement_type: formData.get('movement_type') as 'receipt' | 'issue',
      quantity: Number(formData.get('quantity')),
      reference_note: (formData.get('reference_note') as string) || undefined,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Item</label>
        <select name="item_id" required className="w-48 rounded px-2 py-1 text-sm">
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Movement</label>
        <select name="movement_type" required className="rounded px-2 py-1 text-sm">
          <option value="receipt">Receipt (from supplier)</option>
          <option value="issue">Issue (outbound order)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
        <input name="quantity" type="number" step="0.01" required className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Reference</label>
        <input name="reference_note" placeholder="Supplier / order #" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Recording…' : 'Record Movement'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
