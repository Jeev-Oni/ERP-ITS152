import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// "Generate Digital Payslip" output — every payslip ever generated, newest first.
export default async function PayslipsPage() {
  const supabase = createClient();
  const { data: payslips } = await supabase
    .from('payslips')
    .select('*, payroll_computations(net_pay, employees(full_name), payroll_cutoffs(period_start, period_end))')
    .order('generated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payslips</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Employee</th>
            <th>Period</th>
            <th>Net Pay</th>
            <th>Generated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(payslips ?? []).map((p: any) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.payroll_computations?.employees?.full_name ?? '—'}</td>
              <td>
                {p.payroll_computations?.payroll_cutoffs?.period_start} → {p.payroll_computations?.payroll_cutoffs?.period_end}
              </td>
              <td>₱{Number(p.payroll_computations?.net_pay ?? 0).toFixed(2)}</td>
              <td>{new Date(p.generated_at).toLocaleDateString()}</td>
              <td>
                <Link href={`/hr/payslips/${p.id}`} className="text-blue-600 underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
          {(payslips ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No payslips generated yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
