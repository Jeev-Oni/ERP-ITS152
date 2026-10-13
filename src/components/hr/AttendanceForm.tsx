'use client';

import { useState } from 'react';
import { logAttendance } from '@/lib/actions/salary-distribution';
import { hoursBetween } from '@/lib/payroll/calculate';

// Existing records follow "(time out - time in) minus a 1h unpaid break" (07:56-17:00 = 8.07).
// A break is only deducted on longer shifts, so a short 4-hour shift isn't docked an hour.
// Change these two numbers to match company policy.
const UNPAID_BREAK_HOURS = 1;
const BREAK_APPLIES_OVER_HOURS = 5;

function suggestHours(timeIn: string, timeOut: string) {
  if (!timeIn || !timeOut) return '';
  const gross = hoursBetween(timeIn, timeOut, 0);
  return String(hoursBetween(timeIn, timeOut, gross > BREAK_APPLIES_OVER_HOURS ? UNPAID_BREAK_HOURS : 0));
}

export function AttendanceForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [hours, setHours] = useState('');

  // Fill Hours from the times, but the user can still overwrite it (e.g. a half day).
  function onTimeChange(nextIn: string, nextOut: string) {
    setTimeIn(nextIn);
    setTimeOut(nextOut);
    const suggested = suggestHours(nextIn, nextOut);
    if (suggested) setHours(suggested);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await logAttendance({
      employee_id: formData.get('employee_id') as string,
      log_date: formData.get('log_date') as string,
      time_in: (formData.get('time_in') as string) || undefined,
      time_out: (formData.get('time_out') as string) || undefined,
      hours_worked: Number(formData.get('hours_worked')),
    });

    setPending(false);
    if (result.error) setError(result.error);
    else { setTimeIn(''); setTimeOut(''); setHours(''); }
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Employee</label>
        <select name="employee_id" required className="rounded border px-2 py-1 text-sm">
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Date</label>
        <input type="date" name="log_date" required className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Time In</label>
        <input type="time" name="time_in" value={timeIn} onChange={(e) => onTimeChange(e.target.value, timeOut)} className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Time Out</label>
        <input type="time" name="time_out" value={timeOut} onChange={(e) => onTimeChange(timeIn, e.target.value)} className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Hours</label>
        <input type="number" step="0.01" min="0" max="24" name="hours_worked" value={hours} onChange={(e) => setHours(e.target.value)} required className="w-20 rounded border px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Saving…' : 'Log Attendance'}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
