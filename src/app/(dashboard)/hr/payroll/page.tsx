import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasRole } from '@/lib/roles';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';
import { CreateCutoffForm } from '@/components/hr/CreateCutoffForm';
import { CutoffRow } from '@/components/hr/CutoffRow';

// List of every payroll_cutoffs row — the entry point into Salary Distribution.
export default async function PayrollPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const canEdit = hasRole(profile?.role, ['hr_payroll_officer']);

  const { data: cutoffs } = await supabase
    .from('payroll_cutoffs')
    .select('*')
    .order('period_start', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="HR & Administration" title="Payroll" description="Each cutoff is one pay period, handed from HR to Management to Finance." />
      {!canEdit && <ReadOnlyNotice role={profile?.role} who="HR / Payroll Officer" />}

      {canEdit && <CreateCutoffForm />}

      <div className="table-wrap">
<table className="data-table">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Period Start</th>
            <th>Period End</th>
            <th>Status</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(cutoffs ?? []).map((cutoff: any) => (
            <CutoffRow key={cutoff.id} cutoff={cutoff} canEdit={canEdit} />
          ))}
          {(cutoffs ?? []).length === 0 && (
            <tr><td colSpan={5} className="py-4 text-muted-foreground">No cutoffs yet.</td></tr>
          )}
        </tbody>
      </table>
</div>
    </div>
  );
}
