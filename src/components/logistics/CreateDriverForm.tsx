'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDriver } from '@/lib/actions/trucking-logistics';

export function CreateDriverForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createDriver({
      full_name: formData.get('full_name'),
      license_number: formData.get('license_number'),
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
        <label className="mb-1 block text-xs text-muted-foreground">Full Name</label>
        <input name="full_name" required className="w-48 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">License No.</label>
        <input name="license_number" placeholder="N01-23-456789" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Adding…' : 'Add Driver'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
