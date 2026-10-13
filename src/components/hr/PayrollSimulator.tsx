'use client';

import { useState } from 'react';
import { previewPayroll } from '@/lib/actions/salary-distribution';

type Line = {
  employeeId: string;
  fullName: string;
  dailyRate: number;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
};

type Preview = {
  cutoffStatus: string | null;
  lines: Line[];
  totals: { regularHours: number; overtimeHours: number; grossPay: number; deductions: number; netPay: number };
};

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LOCKED_STATUSES = ['computed', 'pending_approval', 'approved', 'disbursed'];

// Read-only "what would payroll be?" tool. Calls previewPayroll(), which never writes and never
// changes a cutoff's status, so it is safe to run on locked periods and on periods that have no
// cutoff yet. HR/Payroll Officer only — it reads employees.daily_rate.
export function PayrollSimulator({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await previewPayroll(
      formData.get('period_start') as string,
      formData.get('period_end') as string,
      {
        overtimeMultiplier: Number(formData.get('ot_multiplier')) || 1.25,
        overtimeThresholdHours: Number(formData.get('ot_threshold')) || 0,
      }
    );

    setPending(false);
    if ('error' in result && result.error) {
      setPreview(null);
      setError(result.error);
    } else if ('lines' in result) {
      setPreview(result as unknown as Preview);
    }
  }

  const locked = preview?.cutoffStatus ? LOCKED_STATUSES.includes(preview.cutoffStatus) : false;

  return (
    <div className="space-y-4">
      <form action={handleSubmit} className="flex flex-wrap items-end gap-3 panel p-5">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Period Start</label>
          <input type="date" name="period_start" defaultValue={defaultStart} required className="rounded border px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Period End</label>
          <input type="date" name="period_end" defaultValue={defaultEnd} required className="rounded border px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">OT multiplier</label>
          <input type="number" step="0.05" min="1" name="ot_multiplier" defaultValue="1.25" className="w-24 rounded border px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" title="Overtime only counts once the excess over 8h reaches this many hours">
            OT starts after (hrs over 8)
          </label>
          <input type="number" step="0.25" min="0" name="ot_threshold" defaultValue="0" className="w-24 rounded border px-2 py-1 text-sm" />
        </div>
        <button type="submit" disabled={pending} className="rounded border px-4 py-1.5 text-sm">
          {pending ? 'Calculating…' : 'Run Simulation'}
        </button>
        <p className="w-full text-xs text-muted-foreground">
          Simulation only: nothing is saved, no status changes, and attendance is not locked. Works on locked periods too.
        </p>
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
      </form>

      {preview && (
        <>
          {locked && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              A cutoff for this exact period is already <strong>{preview.cutoffStatus}</strong>. These figures are recalculated live from
              current attendance and will match the saved computation unless you changed the multiplier or threshold above.
            </p>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Employee</th>
                  <th>Daily Rate</th>
                  <th>Days</th>
                  <th>Regular Hrs</th>
                  <th>OT Hrs</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.employeeId} className="border-b">
                    <td className="py-2">{l.fullName}</td>
                    <td>{peso(l.dailyRate)}</td>
                    <td>{l.daysWorked}</td>
                    <td>{l.regularHours}</td>
                    <td>{l.overtimeHours}</td>
                    <td>{peso(l.grossPay)}</td>
                    <td>{peso(l.deductions)}</td>
                    <td className="font-medium">{peso(l.netPay)}</td>
                  </tr>
                ))}
                {preview.lines.length === 0 && (
                  <tr><td colSpan={8} className="py-4 text-muted-foreground">No active employees.</td></tr>
                )}
              </tbody>
              {preview.lines.length > 0 && (
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2">Total</td>
                    <td></td>
                    <td></td>
                    <td>{preview.totals.regularHours}</td>
                    <td>{preview.totals.overtimeHours}</td>
                    <td>{peso(preview.totals.grossPay)}</td>
                    <td>{peso(preview.totals.deductions)}</td>
                    <td>{peso(preview.totals.netPay)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
