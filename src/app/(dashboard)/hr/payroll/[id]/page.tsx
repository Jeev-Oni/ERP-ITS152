import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { CutoffActions } from '@/components/hr/CutoffActions';
import { PayrollComputationsTable } from '@/components/hr/PayrollComputationsTable';
import { PayrollApprovalPanel } from '@/components/hr/PayrollApprovalPanel';
import { DisbursementPanel } from '@/components/hr/DisbursementPanel';
import { GeneratePayslipsButton } from '@/components/hr/GeneratePayslipsButton';
import { PayrollProgress } from '@/components/hr/PayrollProgress';

// One payroll_cutoffs row end to end: compute -> approve/revise -> disburse -> payslips.
// This page is the full state machine described in docs/process-flows/salary-distribution.md.
export default async function PayrollCutoffDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: cutoff } = await supabase.from('payroll_cutoffs').select('*').eq('id', params.id).single();
  if (!cutoff) return <p>Cutoff not found.</p>;

  const { data: computations } = await supabase
    .from('payroll_computations')
    .select('*, employees(full_name)')
    .eq('payroll_cutoff_id', params.id);

  const { data: approvals } = await supabase
    .from('payroll_approvals')
    .select('*, profiles(full_name)')
    .eq('payroll_cutoff_id', params.id)
    .order('decided_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Cutoff: {cutoff.period_start} → {cutoff.period_end}
          </h1>
          <StatusBadge status={cutoff.status} />
        </div>
        <CutoffActions cutoffId={cutoff.id} status={cutoff.status} currentRole={role} />
      </div>

      <PayrollProgress status={cutoff.status} role={role} />

      <PayrollComputationsTable
        computations={(computations as any) ?? []}
        status={cutoff.status}
        currentRole={role}
      />

      <RoleGate currentRole={role as any} allow={['management']}>
        {cutoff.status === 'computed' && <PayrollApprovalPanel cutoffId={cutoff.id} />}
      </RoleGate>

      {approvals && approvals.length > 0 && (
        <div className="rounded-lg border p-4 text-sm">
          <p className="mb-2 font-medium">Approval history</p>
          <ul className="space-y-1">
            {approvals.map((a: any) => (
              <li key={a.id}>
                {a.decision === 'approved' ? 'Approved' : 'Sent back for revision'} by{' '}
                {a.profiles?.full_name ?? 'unknown'} — {a.reason || 'no reason given'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <RoleGate currentRole={role as any} allow={['finance']}>
        {cutoff.status === 'approved' && <DisbursementPanel cutoffId={cutoff.id} />}
      </RoleGate>

      <RoleGate currentRole={role as any} allow={['hr_payroll_officer']}>
        {(cutoff.status === 'approved' || cutoff.status === 'disbursed') && (
          <GeneratePayslipsButton cutoffId={cutoff.id} />
        )}
      </RoleGate>
    </div>
  );
}
