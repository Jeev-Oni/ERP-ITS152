'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { lookupLocation, assignLocation } from '@/lib/actions/storage-location';

type Item = { id: string; sku: string; name: string };
type Bin = { id: string; bin_code: string };

// "Check Existing Location Mapping" -> "Location Already Assigned?" -> either branch,
// all in one tool, matching the doc's note that this is a single lookup/assign decision
// rather than a multi-step flow.
export function AssignLocationTool({ items, bins }: { items: Item[]; bins: Bin[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState('');
  const [binId, setBinId] = useState('');
  const [currentBin, setCurrentBin] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [checked, setChecked] = useState(false);

  async function handleItemChange(id: string) {
    setItemId(id);
    setChecked(false);
    setCurrentBin(null);
    if (!id) return;
    setLooking(true);
    const result = await lookupLocation(id);
    setLooking(false);
    setChecked(true);
    if (result.assigned && result.location) {
      setCurrentBin((result.location as any).storage_locations?.bin_code ?? null);
    }
  }

  async function handleAssign() {
    if (!itemId || !binId) return;
    setAssigning(true);
    await assignLocation(itemId, binId);
    setAssigning(false);
    router.refresh();
    // Re-check so the "currently assigned" line reflects the new bin immediately.
    handleItemChange(itemId);
  }

  return (
    <div className="space-y-3 panel p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Item</label>
          <select
            value={itemId}
            onChange={(e) => handleItemChange(e.target.value)}
            className="w-56 rounded px-2 py-1 text-sm"
          >
            <option value="">Select an item…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
            ))}
          </select>
        </div>
        {itemId && (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Assign / Move to Bin</label>
              <select value={binId} onChange={(e) => setBinId(e.target.value)} className="w-40 rounded px-2 py-1 text-sm">
                <option value="">Select a bin…</option>
                {bins.map((bin) => (
                  <option key={bin.id} value={bin.id}>{bin.bin_code}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              disabled={!binId || assigning}
              className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </>
        )}
      </div>
      {itemId && checked && !looking && (
        <p className="text-sm text-muted-foreground">
          {currentBin ? (
            <>Currently in bin <span className="text-primary">{currentBin}</span> — retrieve there, or assign a new bin above to move it.</>
          ) : (
            <>No bin assigned yet — this item has never been located.</>
          )}
        </p>
      )}
    </div>
  );
}
