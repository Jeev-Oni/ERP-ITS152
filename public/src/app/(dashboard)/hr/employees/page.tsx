import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/roles';
import { CreateEmployeeForm } from '@/components/hr/CreateEmployeeForm';
import { EmployeeRow } from '@/components/hr/EmployeeRow';

// Employee Master — the shared reference table Salary Distribution is built on.
// HR / Payroll Officer manages it; Management and Finance can read it (RLS: employees_read).
export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;
  const canEdit = hasRole(role, ['hr_payroll_officer']);

  const { data: employees } = await supabase.from('employees').select('*').order('employee_code');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Employees</h1>

      {canEdit && <CreateEmployeeForm />}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Position</th>
            <th>Daily Rate</th>
            <th>Bank Account</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(employees ?? []).map((e: any) => (
            <EmployeeRow key={e.id} employee={e} canEdit={canEdit} />
          ))}
          {(employees ?? []).length === 0 && (
            <tr><td colSpan={7} className="py-4 text-muted-foreground">No employees yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
