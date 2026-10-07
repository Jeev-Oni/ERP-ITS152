'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee } from '@/lib/actions/salary-distribution';

// Employee Master entry point — HR / Payroll Officer.
export function CreateEmployeeForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createEmployee({
      employee_code: formData.get('employee_code'),
      full_name: formData.get('full_name'),
      position: formData.get('position'),
      daily_rate: formData.get('daily_rate'),
      bank_account_number: formData.get('bank_account_number'),
    });
    setPending(false);
    if (result.error) setError(result.error);
    else {
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Employee Code</label>
        <input name="employee_code" required placeholder="EMP-003" className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Full Name</label>
        <input name="full_name" required className="w-48 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Position</label>
        <input name="position" placeholder="Warehouse Staff" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Daily Rate</label>
        <input name="daily_rate" type="number" step="0.01" min="0" required className="w-28 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Bank Account No.</label>
        <input name="bank_account_number" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Adding…' : 'Add Employee'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
