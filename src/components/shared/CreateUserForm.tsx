'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/actions/admin';

const ROLES = [
  'admin_staff', 'hr_payroll_officer', 'management', 'finance',
  'warehouse_staff', 'warehouse_supervisor',
  'dispatcher', 'driver', 'fleet_supervisor', 'system_admin',
];
const DEPARTMENTS = ['hr_administration', 'warehouse_operations', 'delivery_logistics', 'executive'];

// Creates a login (email + password) and its profile in one step. System Admin only.
export function CreateUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setCreated(null);
    const email = formData.get('email') as string;
    const result = await createUser({
      full_name: formData.get('full_name'),
      email,
      password: formData.get('password'),
      role: formData.get('role'),
      department: formData.get('department'),
    });
    setPending(false);
    if (result.error) setError(result.error);
    else {
      setCreated(email);
      formRef.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Full Name</label>
        <input name="full_name" required className="w-44 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Email</label>
        <input name="email" type="email" required className="w-52 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Temporary Password</label>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className="w-40 rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Role</label>
        <select name="role" required defaultValue="" className="rounded px-2 py-1 text-sm">
          <option value="" disabled>Select…</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Department</label>
        <select name="department" required defaultValue="" className="rounded px-2 py-1 text-sm">
          <option value="" disabled>Select…</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Creating…' : 'Create User'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
      {created && <p className="w-full text-sm text-emerald-300">Created {created}. They can sign in now with the temporary password.</p>}
    </form>
  );
}
