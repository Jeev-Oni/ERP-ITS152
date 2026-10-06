'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { disbursePay } from '@/lib/actions/salary-distribution';

// "Disburse Pay via Bank Transfer" — Finance. Idempotent server-side, so a double-click
// here can't send two transfers.
export function DisbursementPanel({ cutoffId }: { cutoffId: string }) {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleDisburse() {
    setPending(true);
    setNote(null);
    const result = await disbursePay(cutoffId, reference || undefined);
    setPending(false);
    if (result.error) setNote(result.error);
    else if (result.note) setNote(result.note);
    else setNote('Disbursed.');
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-medium">Disburse Pay via Bank Transfer</p>
      <input
        placeholder="Bank reference (optional)"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="mb-2 w-full rounded border px-2 py-1 text-sm"
      />
      <button
        onClick={handleDisburse}
        disabled={pending}
        className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        {pending ? 'Disbursing…' : 'Disburse'}
      </button>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
