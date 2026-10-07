'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateComputationDeductions } from '@/lib/actions/salary-distribution';

type Computation = {
  id: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  employees?: { full_name: string } | null;
};

// Table for one payroll_cutoff. Deductions are editable inline by HR/Payroll Officer
// while the cutoff is still in 'computed' or 'revision_needed' — once Management
// approves, this table is read-only everywhere (RLS also blocks the write server-side).
export function PayrollComputationsTable({
  computations,
  status,
  currentRole,
}: {
  computations: Computation[];
  status: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const editable = currentRole === 'hr_payroll_officer' && (status === 'computed' || status === 'revision_needed');

  async function handleSave(id: string, value: number) {
    setPendingId(id);
    await updateComputationDeductions(id, value);
    setPendingId(null);
    router.refresh();
  }

  if (computations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No computations yet — run Compute Payroll above once the cutoff is closed.
      </p>
    );
  }

  return (
    <div className="table-wrap">
<table className="data-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Employee</th>
          <th>Regular Hrs</th>
          <th>OT Hrs</th>
          <th>Gross Pay</th>
          <th>Deductions</th>
          <th>Net Pay</th>
        </tr>
      </thead>
      <tbody>
        {computations.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="py-2">{c.employees?.full_name ?? '—'}</td>
            <td>{c.regular_hours}</td>
            <td>{c.overtime_hours}</td>
            <td>₱{Number(c.gross_pay).toFixed(2)}</td>
            <td>
              {editable ? (
                <input
                  type="number"
                  step="0.01"
                  defaultValue={c.deductions}
                  disabled={pendingId === c.id}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value !== Number(c.deductions)) handleSave(c.id, value);
                  }}
                  className="w-24 rounded border px-1.5 py-0.5"
                />
              ) : (
                <>₱{Number(c.deductions).toFixed(2)}</>
              )}
            </td>
            <td className="font-medium">₱{Number(c.net_pay).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
</div>
  );
}
