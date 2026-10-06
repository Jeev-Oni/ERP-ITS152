'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole, updateUserName, toggleUserActive } from '@/lib/actions/admin';

const ROLES = [
  'admin_staff', 'hr_payroll_officer', 'management', 'finance',
  'warehouse_staff', 'warehouse_supervisor',
  'dispatcher', 'driver', 'fleet_supervisor', 'system_admin',
];
const DEPARTMENTS = ['hr_administration', 'warehouse_operations', 'delivery_logistics', 'executive'];

type Profile = { id: string; full_name: string; role: string; department: string; is_active: boolean };

export function UserRow({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameDirty = name.trim() !== profile.full_name;
  const accessDirty = role !== profile.role || department !== profile.department;
  const dirty = nameDirty || accessDirty;

  async function handleSave() {
    setPending(true);
    setError(null);
    if (nameDirty) {
      const r = await updateUserName(profile.id, name);
      if (r.error) { setError(r.error); setPending(false); return; }
    }
    if (accessDirty) {
      const r = await updateUserRole(profile.id, role, department);
      if (r.error) { setError(r.error); setPending(false); return; }
    }
    setPending(false);
    router.refresh();
  }

  async function handleToggleActive() {
    setPending(true);
    setError(null);
    const r = await toggleUserActive(profile.id, !profile.is_active);
    setPending(false);
    if (r.error) setError(r.error);
    else router.refresh();
  }

  return (
    <tr className="border-b border-border align-top">
      <td className="py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-44 rounded px-1.5 py-0.5 text-xs" />
        {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
      </td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded px-1.5 py-0.5 text-xs">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded px-1.5 py-0.5 text-xs">
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </td>
      <td>{profile.is_active ? 'Yes' : 'No'}</td>
      <td>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={handleSave} disabled={pending} className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              Save
            </button>
          )}
          <button onClick={handleToggleActive} disabled={pending || isSelf} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40">
            {profile.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
        {error && <p className="mt-1 max-w-xs text-xs text-red-400">{error}</p>}
      </td>
    </tr>
  );
}
