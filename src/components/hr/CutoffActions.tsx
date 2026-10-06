'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { closeCutoff, computePayroll, reopenCutoffForCorrection } from '@/lib/actions/salary-distribution';
import { ConfirmButton } from '@/components/shared/ConfirmButton';
import { RoleGate } from '@/components/shared/RoleGate';

// "Cutoff Reached?" gateway + "Compute Hours, OT & Deductions" — both HR/Payroll Officer.
export function CutoffActions({
  cutoffId,
  status,
  currentRole,
}: {
  cutoffId: string;
  status: string;
  currentRole: any;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    setPending(true);
    setError(null);
    const result = await closeCutoff(cutoffId);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleCompute() {
    setPending(true);
    setError(null);
    const result = await computePayroll(cutoffId);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <RoleGate currentRole={currentRole} allow={['hr_payroll_officer']}>
      <div className="flex items-center gap-2">
        {status === 'open' && (
          <button onClick={handleClose} disabled={pending} className="rounded border px-3 py-1.5 text-sm">
            Close Cutoff
          </button>
        )}
        {(status === 'closed' || status === 'revision_needed') && (
          <button
            onClick={handleCompute}
            disabled={pending}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            {pending ? 'Computing…' : status === 'revision_needed' ? 'Recompute Payroll' : 'Compute Payroll'}
          </button>
        )}
        {status === 'computed' && (
          <ConfirmButton
            label="Send Back for Correction"
            confirmLabel="Send back"
            danger={false}
            onConfirm={() => reopenCutoffForCorrection(cutoffId)}
            onDone={() => router.refresh()}
            onError={setError}
          />
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </RoleGate>
  );
}
