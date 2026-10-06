'use client';

import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { updateAttendance, deleteAttendance } from '@/lib/actions/salary-distribution';

type Log = {
  id: string;
  log_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number | string | null;
};

const FIELDS: Field[] = [
  { name: 'employee', type: 'text', readOnly: true },
  { name: 'log_date', type: 'date', required: true, width: 'w-36' },
  { name: 'time_in', type: 'time', width: 'w-28' },
  { name: 'time_out', type: 'time', width: 'w-28' },
  { name: 'hours_worked', type: 'number', step: '0.5', required: true, width: 'w-20' },
];

// Postgres returns time as HH:MM:SS; the time input and display only need HH:MM.
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

export function AttendanceRow({
  log,
  employeeName,
  canEdit,
  locked,
}: {
  log: Log;
  employeeName: string;
  canEdit: boolean;
  /** Payroll for this date has been computed: row is frozen (also enforced by RLS). */
  locked: boolean;
}) {
  const editable = canEdit && !locked;
  return (
    <EditableRow
      fields={FIELDS}
      values={{
        employee: employeeName,
        log_date: log.log_date,
        time_in: hhmm(log.time_in),
        time_out: hhmm(log.time_out),
        hours_worked: log.hours_worked == null ? '' : String(log.hours_worked),
      }}
      canEdit={editable}
      lockedNote={canEdit && locked ? 'Locked — payroll computed' : undefined}
      onSave={(v) => updateAttendance(log.id, v)}
      onDelete={() => deleteAttendance(log.id)}
    />
  );
}
