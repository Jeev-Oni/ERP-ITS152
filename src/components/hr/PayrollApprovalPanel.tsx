'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decidePayrollApproval } from '@/lib/actions/salary-distribution';

// "Approved by Management?" gateway. A rejection requires a reason so the
// "Revise Computation" loop always tells HR what to fix.
export function PayrollApprovalPanel({ cutoffId }: { cutoffId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(decision: 'approved' | 'revision_needed') {
    if (decision === 'revision_needed' && !reason.trim()) {
      setError('Add a reason so HR knows what to revise.');
      return;
    }
    setPending(true);
    setError(null);
    const result = await decidePayrollApproval({ payroll_cutoff_id: cutoffId, decision, reason: reason || undefined });
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-medium">Management Approval</p>
      <textarea
        placeholder="Reason (required if sending back for revision)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded border px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleDecision('approved')}
          disabled={pending}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white"
        >
          Approve
        </button>
        <button
          onClick={() => handleDecision('revision_needed')}
          disabled={pending}
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
        >
          Send Back for Revision
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
