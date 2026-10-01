import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { CreateCutoffForm } from '@/components/hr/CreateCutoffForm';

// List of every payroll_cutoffs row — the entry point into Salary Distribution.
export default async function PayrollPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const { data: cutoffs } = await supabase
    .from('payroll_cutoffs')
    .select('*')
    .order('period_start', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payroll</h1>

      <RoleGate currentRole={(profile?.role ?? '') as any} allow={['hr_payroll_officer']}>
        <CreateCutoffForm />
      </RoleGate>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Period</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(cutoffs ?? []).map((cutoff: any) => (
            <tr key={cutoff.id} className="border-b">
              <td className="py-2">{cutoff.period_start} → {cutoff.period_end}</td>
              <td><StatusBadge status={cutoff.status} /></td>
              <td>
                <Link href={`/hr/payroll/${cutoff.id}`} className="text-sm text-blue-600 underline">
                  Open
                </Link>
              </td>
            </tr>
          ))}
          {(cutoffs ?? []).length === 0 && (
            <tr><td colSpan={3} className="py-4 text-muted-foreground">No cutoffs yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
