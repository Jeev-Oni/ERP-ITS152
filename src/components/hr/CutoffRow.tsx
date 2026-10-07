'use client';

import Link from 'next/link';
import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { updatePayrollCutoff, deletePayrollCutoff } from '@/lib/actions/salary-distribution';

const FIELDS: Field[] = [
  { name: 'period_start', type: 'date', required: true, width: 'w-36' },
  { name: 'period_end', type: 'date', required: true, width: 'w-36' },
];

// Only an 'open' cutoff can be re-dated or deleted. Once it's been computed, approved or
// disbursed it is part of the payroll record (enforced in the action and by RLS).
export function CutoffRow({
  cutoff,
  canEdit,
}: {
  cutoff: { id: string; period_start: string; period_end: string; status: string };
  canEdit: boolean;
}) {
  return (
    <EditableRow
      fields={FIELDS}
      values={{ period_start: cutoff.period_start, period_end: cutoff.period_end }}
      extraCells={
        <>
          <td><StatusBadge status={cutoff.status} /></td>
          <td>
            <Link href={`/hr/payroll/${cutoff.id}`} className="text-sm text-primary underline-offset-4 hover:underline">Open</Link>
          </td>
        </>
      }
      canEdit={canEdit && cutoff.status === 'open'}
      onSave={(v) => updatePayrollCutoff(cutoff.id, v)}
      onDelete={() => deletePayrollCutoff(cutoff.id)}
    />
  );
}
