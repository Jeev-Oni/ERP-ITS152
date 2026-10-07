'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generatePayslips } from '@/lib/actions/salary-distribution';

// "Generate Digital Payslip" — HR/Payroll Officer, once Management has approved.
export function GeneratePayslipsButton({ cutoffId }: { cutoffId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setMessage(null);
    const result = await generatePayslips(cutoffId);
    setPending(false);
    if (result.error) setMessage(result.error);
    else setMessage(`Generated ${result.generated} new payslip(s).`);
    router.refresh();
  }

  return (
    <div className="panel p-5">
      <button
        onClick={handleGenerate}
        disabled={pending}
        className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        {pending ? 'Generating…' : 'Generate Payslips'}
      </button>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
