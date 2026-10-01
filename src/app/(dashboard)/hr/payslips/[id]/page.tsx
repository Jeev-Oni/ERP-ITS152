import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/hr/PrintButton';

// The employee-facing artifact of the whole process: attendance -> computation ->
// approval -> disbursement all collapse into this one printable page.
export default async function PayslipDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: payslip } = await supabase
    .from('payslips')
    .select('*, payroll_computations(*, employees(*), payroll_cutoffs(*))')
    .eq('id', params.id)
    .single();

  if (!payslip) return <p>Payslip not found.</p>;

  const comp: any = payslip.payroll_computations;
  const employee = comp?.employees;
  const cutoff = comp?.payroll_cutoffs;

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-lg border p-6 print:border-none">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">JJPG Trading — Payslip</h1>
        <PrintButton />
      </div>
      <div className="text-sm">
        <p><span className="text-muted-foreground">Employee:</span> {employee?.full_name}</p>
        <p><span className="text-muted-foreground">Position:</span> {employee?.position ?? '—'}</p>
        <p><span className="text-muted-foreground">Pay Period:</span> {cutoff?.period_start} → {cutoff?.period_end}</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b"><td className="py-1">Regular Hours</td><td className="text-right">{comp?.regular_hours}</td></tr>
          <tr className="border-b"><td className="py-1">Overtime Hours</td><td className="text-right">{comp?.overtime_hours}</td></tr>
          <tr className="border-b"><td className="py-1">Gross Pay</td><td className="text-right">₱{Number(comp?.gross_pay ?? 0).toFixed(2)}</td></tr>
          <tr className="border-b"><td className="py-1">Deductions</td><td className="text-right">₱{Number(comp?.deductions ?? 0).toFixed(2)}</td></tr>
          <tr><td className="py-1 font-semibold">Net Pay</td><td className="text-right font-semibold">₱{Number(comp?.net_pay ?? 0).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">Generated {new Date(payslip.generated_at).toLocaleString()}</p>
    </div>
  );
}
