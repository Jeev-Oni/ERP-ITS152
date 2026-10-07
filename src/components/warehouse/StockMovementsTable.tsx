'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyMovement, resolveDiscrepancy, deleteStockMovement } from '@/lib/actions/warehouse-recording';
import { ConfirmButton } from '@/components/shared/ConfirmButton';
import { hasRole } from '@/lib/roles';
import { StatusBadge } from '@/components/shared/StatusBadge';

type Discrepancy = { id: string; physical_count: number; system_count: number; resolved_at: string | null };
type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  reference_note: string | null;
  status: string;
  logged_by: string;
  logged_at: string;
  items?: { sku: string; name: string } | null;
  stock_discrepancies?: Discrepancy[] | null;
};

function VerifyControl({ movementId }: { movementId: string }) {
  const router = useRouter();
  const [count, setCount] = useState('');
  const [pending, setPending] = useState(false);

  async function handleVerify() {
    if (!count) return;
    setPending(true);
    await verifyMovement(movementId, Number(count));
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.01"
        placeholder="Physical count"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className="w-36 rounded px-1.5 py-0.5 text-xs"
      />
      <button onClick={handleVerify} disabled={pending || !count} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover">
        Verify
      </button>
    </div>
  );
}

function ResolveControl({ discrepancy }: { discrepancy: Discrepancy }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function handleResolve() {
    if (!note.trim()) return;
    setPending(true);
    await resolveDiscrepancy(discrepancy.id, note);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-red-300">
        System said {discrepancy.system_count}, physical count was {discrepancy.physical_count}
      </p>
      <div className="flex items-center gap-1.5">
        <input
          placeholder="Resolution note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-48 rounded px-1.5 py-0.5 text-xs"
        />
        <button onClick={handleResolve} disabled={pending || !note.trim()} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover">
          Resolve
        </button>
      </div>
    </div>
  );
}

// A movement past 'pending' has already changed the item balance, so deleting it also puts
// the balance back (done by a database trigger). The confirm button says so.
function DeleteControl({ movement }: { movement: Movement }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <ConfirmButton
        label="Delete"
        confirmLabel={movement.status === 'pending' ? 'Delete' : 'Delete & undo stock'}
        onConfirm={() => deleteStockMovement(movement.id)}
        onDone={() => router.refresh()}
        onError={setError}
      />
      {error && <p className="mt-1 max-w-xs text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function StockMovementsTable({ movements, role, userId }: { movements: Movement[]; role: string; userId: string }) {
  const isSupervisor = hasRole(role, ['warehouse_supervisor']);
  const showActions = hasRole(role, ['warehouse_supervisor', 'warehouse_staff']);
  // Supervisor: any movement. Staff: only their own, until the Supervisor has verified it.
  const canDelete = (m: Movement) =>
    isSupervisor || (role === 'warehouse_staff' && m.logged_by === userId && ['pending', 'logged'].includes(m.status));

  return (
    <div className="table-wrap">
<table className="data-table">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2">Item</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Reference</th>
          <th>Status</th>
          <th>Logged</th>
          {showActions && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => {
          const openDiscrepancy = m.stock_discrepancies?.find((d) => !d.resolved_at);
          return (
            <tr key={m.id} className="border-b border-border align-top">
              <td className="py-2">{m.items?.sku ?? '—'}</td>
              <td className="capitalize">{m.movement_type}</td>
              <td>{m.quantity}</td>
              <td className="text-muted-foreground">{m.reference_note ?? '—'}</td>
              <td><StatusBadge status={m.status} /></td>
              <td className="text-muted-foreground">{new Date(m.logged_at).toLocaleDateString()}</td>
              {showActions && (
                <td>
                  <div className="space-y-1.5">
                    {isSupervisor && m.status === 'logged' && <VerifyControl movementId={m.id} />}
                    {isSupervisor && m.status === 'discrepancy' && openDiscrepancy && <ResolveControl discrepancy={openDiscrepancy} />}
                    {canDelete(m) && <DeleteControl movement={m} />}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
        {movements.length === 0 && (
          <tr><td colSpan={showActions ? 7 : 6} className="py-4 text-muted-foreground">No stock movements yet.</td></tr>
        )}
      </tbody>
    </table>
</div>
  );
}
