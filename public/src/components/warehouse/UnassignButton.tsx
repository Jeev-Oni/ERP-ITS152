'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/shared/ConfirmButton';
import { unassignLocation } from '@/lib/actions/storage-location';

// Clears an item's bin so it reads as "not yet located" again.
export function UnassignButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <ConfirmButton
        label="Unassign"
        confirmLabel="Unassign"
        onConfirm={() => unassignLocation(itemId)}
        onDone={() => router.refresh()}
        onError={setError}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
