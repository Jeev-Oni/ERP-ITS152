'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPayrollCutoff } from '@/lib/actions/salary-distribution';

// "Cutoff Period Begins" — HR/Payroll Officer opens the window Admin Staff logs against.
export function CreateCutoffForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createPayrollCutoff(
      formData.get('period_start') as string,
      formData.get('period_end') as string
    );
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div>
        <label className="block text-xs text-muted-foreground">Period Start</label>
        <input type="date" name="period_start" required className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Period End</label>
        <input type="date" name="period_end" required className="rounded border px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Creating…' : 'Open New Cutoff'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
