'use client';

import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateStorageLocation, deleteStorageLocation } from '@/lib/actions/storage-location';

const FIELDS: Field[] = [
  { name: 'bin_code', type: 'text', required: true, width: 'w-28', className: 'text-primary' },
  { name: 'zone', type: 'text', width: 'w-28' },
  { name: 'capacity', type: 'number', step: '0.01', width: 'w-28' },
];

export function BinRow({
  bin,
  canEdit,
}: {
  bin: { id: string; bin_code: string; zone: string | null; capacity: number | string | null };
  canEdit: boolean;
}) {
  return (
    <EditableRow
      fields={FIELDS}
      values={{
        bin_code: bin.bin_code,
        zone: bin.zone ?? '',
        capacity: bin.capacity == null ? '' : String(bin.capacity),
      }}
      canEdit={canEdit}
      onSave={(v) => updateStorageLocation(bin.id, v)}
      onDelete={() => deleteStorageLocation(bin.id)}
    />
  );
}
