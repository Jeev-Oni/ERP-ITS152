'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateDriver, setDriverActive, deleteDriver, linkDriverLogin } from '@/lib/actions/trucking-logistics';

type Driver = {
  id: string;
  full_name: string;
  license_number: string | null;
  profile_id: string | null;
  is_active: boolean;
};

const FIELDS: Field[] = [
  { name: 'full_name', type: 'text', required: true, width: 'w-48' },
  { name: 'license_number', type: 'text', width: 'w-40' },
];

export function DriverRow({
  driver,
  canEdit,
  loginOptions,
}: {
  driver: Driver;
  canEdit: boolean;
  /** Present only for System Admin (the only role that can list user accounts). */
  loginOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setBusy(true);
    setError(null);
    const result = await setDriverActive(driver.id, !driver.is_active);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function changeLogin(profileId: string) {
    setBusy(true);
    setError(null);
    const result = await linkDriverLogin(driver.id, profileId || null);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <>
      <EditableRow
        fields={FIELDS}
        values={{ full_name: driver.full_name, license_number: driver.license_number ?? '' }}
        extraCells={
          <>
            <td>
              {loginOptions ? (
                <select
                  value={driver.profile_id ?? ''}
                  onChange={(e) => changeLogin(e.target.value)}
                  disabled={busy}
                  className="w-44 rounded px-1.5 py-0.5 text-xs"
                >
                  <option value="">Not linked</option>
                  {loginOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <span className={driver.profile_id ? '' : 'text-muted-foreground'}>
                  {driver.profile_id ? 'Linked' : 'Not linked'}
                </span>
              )}
            </td>
            <td className={driver.is_active ? '' : 'text-muted-foreground'}>{driver.is_active ? 'Yes' : 'No'}</td>
          </>
        }
        extraActions={
          canEdit && (
            <button
              type="button"
              onClick={toggleActive}
              disabled={busy}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40"
            >
              {driver.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )
        }
        canEdit={canEdit}
        onSave={(v) => updateDriver(driver.id, v)}
        onDelete={() => deleteDriver(driver.id)}
      />
      {error && <tr><td colSpan={5} className="pb-2 text-xs text-red-400">{error}</td></tr>}
    </>
  );
}
