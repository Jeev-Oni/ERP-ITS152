'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from './ConfirmButton';

type Result = { success?: boolean; error?: string } | void;

export type Field = {
  name: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select';
  options?: { value: string; label: string }[];
  step?: string;
  required?: boolean;
  /** Shown in both modes but never editable (e.g. a ledger-managed balance). */
  readOnly?: boolean;
  width?: string;
  placeholder?: string;
  className?: string;
};

const BTN = 'rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40';

/**
 * One table row that flips between read-only and inline-edit. It renders a <td> per field
 * (so the page owns the <thead>), then `extraCells`, then an actions cell.
 *
 * `values` are the raw strings used by the inputs; `display` can override how a field
 * looks when read-only (links, badges, labels) without affecting the edit input.
 */
export function EditableRow({
  fields,
  values,
  display,
  extraCells,
  extraActions,
  canEdit,
  canDelete = canEdit,
  lockedNote,
  deleteLabel = 'Delete',
  onSave,
  onDelete,
}: {
  fields: Field[];
  values: Record<string, string>;
  display?: Record<string, React.ReactNode>;
  extraCells?: React.ReactNode;
  extraActions?: React.ReactNode;
  canEdit: boolean;
  canDelete?: boolean;
  /** Shown instead of the buttons when a row exists but is frozen (e.g. payroll already computed). */
  lockedNote?: string;
  deleteLabel?: string;
  onSave: (values: Record<string, string>) => Promise<Result>;
  onDelete?: () => Promise<Result>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(values);
    setError(null);
    setEditing(true);
  }

  async function save() {
    setPending(true);
    setError(null);
    const result = await onSave(draft);
    setPending(false);
    if (result && result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function viewValue(f: Field) {
    if (display && f.name in display) return display[f.name];
    const raw = values[f.name];
    if (f.type === 'select') return f.options?.find((o) => o.value === raw)?.label ?? '—';
    return raw === '' || raw == null ? '—' : raw;
  }

  return (
    <tr className="border-b border-border align-top">
      {fields.map((f, i) => (
        <td key={f.name} className={`${i === 0 ? 'py-2' : ''} ${f.className ?? ''}`}>
          {editing && !f.readOnly ? (
            f.type === 'select' ? (
              <select
                value={draft[f.name] ?? ''}
                onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                className={`rounded px-1.5 py-0.5 text-xs ${f.width ?? 'w-32'}`}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type}
                step={f.step}
                required={f.required}
                placeholder={f.placeholder}
                value={draft[f.name] ?? ''}
                onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                className={`rounded px-1.5 py-0.5 text-xs ${f.width ?? 'w-28'}`}
              />
            )
          ) : (
            viewValue(f)
          )}
        </td>
      ))}
      {extraCells}
      <td className="whitespace-nowrap">
        <div className="flex flex-wrap items-center gap-1.5">
          {editing ? (
            <>
              <button type="button" onClick={save} disabled={pending} className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground disabled:opacity-50">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={pending} className={BTN}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button type="button" onClick={startEdit} className={BTN}>
                  Edit
                </button>
              )}
              {extraActions}
              {canDelete && onDelete && (
                <ConfirmButton
                  label={deleteLabel}
                  onConfirm={onDelete}
                  onDone={() => router.refresh()}
                  onError={setError}
                />
              )}
              {!canEdit && !canDelete && lockedNote && (
                <span className="text-xs text-muted-foreground">{lockedNote}</span>
              )}
            </>
          )}
        </div>
        {error && <p className="mt-1 max-w-xs text-xs text-red-400">{error}</p>}
      </td>
    </tr>
  );
}
