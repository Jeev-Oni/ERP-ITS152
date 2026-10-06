'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateTruck, setTruckActive, deleteTruck } from '@/lib/actions/trucking-logistics';

type Truck = {
  id: string;
  plate_number: string;
  model: string | null;
  capacity_kg: number | string | null;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
  is_active: boolean;
};

const FIELDS: Field[] = [
  { name: 'plate_number', type: 'text', required: true, width: 'w-28' },
  { name: 'model', type: 'text', width: 'w-36' },
  { name: 'capacity_kg', type: 'number', step: '0.01', width: 'w-28' },
  // Set automatically when maintenance is completed.
  { name: 'last_maintenance_date', type: 'date', readOnly: true, className: 'text-muted-foreground' },
  // Editable: closing a trip auto-schedules maintenance once this date is reached.
  { name: 'next_maintenance_due', type: 'date', width: 'w-36', className: 'text-muted-foreground' },
];

export function TruckRow({ truck, canEdit }: { truck: Truck; canEdit: boolean }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setToggling(true);
    setError(null);
    const result = await setTruckActive(truck.id, !truck.is_active);
    setToggling(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <>
      <EditableRow
        fields={FIELDS}
        values={{
          plate_number: truck.plate_number,
          model: truck.model ?? '',
          capacity_kg: truck.capacity_kg == null ? '' : String(truck.capacity_kg),
          last_maintenance_date: truck.last_maintenance_date ?? '',
          next_maintenance_due: truck.next_maintenance_due ?? '',
        }}
        extraCells={<td className={truck.is_active ? '' : 'text-muted-foreground'}>{truck.is_active ? 'Yes' : 'No'}</td>}
        extraActions={
          canEdit && (
            <button
              type="button"
              onClick={toggleActive}
              disabled={toggling}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40"
            >
              {truck.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )
        }
        canEdit={canEdit}
        onSave={(v) => updateTruck(truck.id, v)}
        onDelete={() => deleteTruck(truck.id)}
      />
      {error && <tr><td colSpan={7} className="pb-2 text-xs text-red-400">{error}</td></tr>}
    </>
  );
}
