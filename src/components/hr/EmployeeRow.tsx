'use client';

import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateEmployee, setEmployeeActive, deleteEmployee } from '@/lib/actions/salary-distribution';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  position: string | null;
  daily_rate: number | string;
  bank_account_number: string | null;
  is_active: boolean;
};

const FIELDS: Field[] = [
  { name: 'employee_code', type: 'text', required: true, width: 'w-24', className: 'font-mono text-xs' },
  { name: 'full_name', type: 'text', required: true, width: 'w-44' },
  { name: 'position', type: 'text', width: 'w-36' },
  { name: 'daily_rate', type: 'number', step: '0.01', required: true, width: 'w-24' },
  { name: 'bank_account_number', type: 'text', width: 'w-36' },
];

// Bank numbers are sensitive: masked when just browsing, full value only inside the edit box.
function mask(v: string | null) {
  if (!v) return '—';
  return v.length <= 4 ? v : `•••• ${v.slice(-4)}`;
}

export function EmployeeRow({ employee, canEdit }: { employee: Employee; canEdit: boolean }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function toggleActive() {
    setToggling(true);
    setToggleError(null);
    const result = await setEmployeeActive(employee.id, !employee.is_active);
    setToggling(false);
    if (result.error) setToggleError(result.error);
    else router.refresh();
  }

  return (
    <>
      <EditableRow
        fields={FIELDS}
        values={{
          employee_code: employee.employee_code,
          full_name: employee.full_name,
          position: employee.position ?? '',
          daily_rate: String(employee.daily_rate),
          bank_account_number: employee.bank_account_number ?? '',
        }}
        display={{ bank_account_number: <span className="text-muted-foreground">{mask(employee.bank_account_number)}</span> }}
        extraCells={<td className={employee.is_active ? '' : 'text-muted-foreground'}>{employee.is_active ? 'Yes' : 'No'}</td>}
        extraActions={
          canEdit && (
            <button
              type="button"
              onClick={toggleActive}
              disabled={toggling}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40"
            >
              {employee.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )
        }
        canEdit={canEdit}
        onSave={(v) => updateEmployee(employee.id, v)}
        onDelete={() => deleteEmployee(employee.id)}
      />
      {toggleError && (
        <tr><td colSpan={7} className="pb-2 text-xs text-red-400">{toggleError}</td></tr>
      )}
    </>
  );
}
