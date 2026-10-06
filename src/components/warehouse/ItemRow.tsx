'use client';

import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateItem, deleteItem } from '@/lib/actions/warehouse-recording';

type Item = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  current_balance: number | string;
  reorder_point: number | string | null;
};

const FIELDS: Field[] = [
  { name: 'sku', type: 'text', required: true, width: 'w-28', className: 'font-mono text-xs' },
  { name: 'name', type: 'text', required: true, width: 'w-48' },
  { name: 'unit', type: 'text', required: true, width: 'w-20' },
  // Read-only on purpose: balances move only via logged stock movements (ledger integrity).
  { name: 'current_balance', type: 'number', readOnly: true },
  { name: 'reorder_point', type: 'number', step: '0.01', width: 'w-28' },
];

export function ItemRow({ item, canEdit, canDelete }: { item: Item; canEdit: boolean; canDelete: boolean }) {
  const low = item.reorder_point != null && Number(item.current_balance) <= Number(item.reorder_point);
  return (
    <EditableRow
      fields={FIELDS}
      values={{
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        current_balance: String(item.current_balance),
        reorder_point: item.reorder_point == null ? '' : String(item.reorder_point),
      }}
      display={{ current_balance: <span className={low ? 'text-red-400' : ''}>{item.current_balance}</span> }}
      canEdit={canEdit}
      canDelete={canDelete}
      onSave={(v) => updateItem(item.id, v)}
      onDelete={() => deleteItem(item.id)}
    />
  );
}
