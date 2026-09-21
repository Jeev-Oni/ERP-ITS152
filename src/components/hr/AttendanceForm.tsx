'use client';

import { useState } from 'react';
import { logAttendance } from '@/lib/actions/salary-distribution';

export function AttendanceForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div>
        <label className="block text-xs text-muted-foreground">Employee</label>
        <select name="employee_id" required className="rounded border px-2 py-1 text-sm">
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Date</label>
        <input type="date" name="log_date" required className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Time In</label>
        <input type="time" name="time_in" className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Time Out</label>
        <input type="time" name="time_out" className="rounded border px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Hours</label>
        <input type="number" step="0.5" name="hours_worked" required className="w-20 rounded border px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground">
        {pending ? 'Saving…' : 'Log Attendance'}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
