'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import {
  updateUserRole,
  updateUserName,
  toggleUserActive,
  updateUserEmail,
  resetUserPassword,
} from '@/lib/actions/admin';

const ROLES = [
  'admin_staff', 'hr_payroll_officer', 'management', 'finance',
  'warehouse_staff', 'warehouse_supervisor',
  'dispatcher', 'driver', 'fleet_supervisor', 'system_admin',
];
const DEPARTMENTS = ['hr_administration', 'warehouse_operations', 'delivery_logistics', 'executive'];

type Profile = { id: string; full_name: string; role: string; department: string; is_active: boolean };

const BTN = 'whitespace-nowrap rounded border border-border px-2 py-1 text-xs hover:bg-surface-hover disabled:opacity-40';

export function UserRow({ profile, email, isSelf }: { profile: Profile; email: string | null; isSelf: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name);
  const [role, setRole] = useState(profile.role);
  const [department, setDepartment] = useState(profile.department);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Account" panel: sign-in email + password, which need the service role so they live apart
  // from the everyday name/role/department edits.
  const [accountOpen, setAccountOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [accountPending, setAccountPending] = useState(false);

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

  async function handleEmail() {
    setAccountPending(true);
    setAccountMsg(null);
    const r = await updateUserEmail(profile.id, newEmail);
    setAccountPending(false);
    if (r.error) return setAccountMsg({ tone: 'error', text: r.error });
    setAccountMsg({ tone: 'ok', text: 'Email updated. They sign in with it from now on.' });
    router.refresh();
  }

  async function handlePassword() {
    setAccountPending(true);
    setAccountMsg(null);
    const r = await resetUserPassword(profile.id, newPassword);
    setAccountPending(false);
    if (r.error) return setAccountMsg({ tone: 'error', text: r.error });
    setNewPassword('');
    setAccountMsg({ tone: 'ok', text: 'Password set. Share it with them privately; they can change it under "Password" in the top bar.' });
  }

  return (
    <>
      <tr className="border-b border-border align-top">
        <td>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-44 rounded px-1.5 py-1 text-sm" />
          {isSelf && <span className="ml-1.5 text-xs text-primary">you</span>}
          <p className="mt-1 text-xs text-muted-foreground">{email ?? 'email unavailable'}</p>
        </td>
        <td>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded px-1.5 py-1 text-xs">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        <td>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded px-1.5 py-1 text-xs">
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </td>
        <td>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              profile.is_active
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-red-400/20 bg-red-400/10 text-red-300'
            }`}
          >
            {profile.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div className="flex flex-wrap gap-2">
            {dirty && (
              <button onClick={handleSave} disabled={pending} className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-50">
                Save
              </button>
            )}
            <button onClick={() => setAccountOpen((o) => !o)} className={BTN} aria-expanded={accountOpen}>
              <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3" />Account</span>
            </button>
            <button onClick={handleToggleActive} disabled={pending || isSelf} className={BTN}>
              {profile.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
          {error && <p className="mt-1.5 max-w-xs text-xs text-red-400">{error}</p>}
        </td>
      </tr>

      {accountOpen && (
        <tr className="border-b border-border bg-background/40">
          <td colSpan={5}>
            <div className="grid gap-5 py-1 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Sign-in email</label>
                <div className="flex gap-2">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded px-2 py-1.5 text-sm" />
                  <button onClick={handleEmail} disabled={accountPending || !newEmail || newEmail === email} className={BTN}>
                    Update
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Set a new password (min. 8 characters)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm"
                  />
                  <button onClick={handlePassword} disabled={accountPending || newPassword.length < 8} className={BTN}>
                    Set password
                  </button>
                </div>
              </div>
              {accountMsg && (
                <p className={`text-xs md:col-span-2 ${accountMsg.tone === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}>
                  {accountMsg.text}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
