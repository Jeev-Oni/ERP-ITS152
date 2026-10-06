import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/roles';
import { AttendanceForm } from '@/components/hr/AttendanceForm';
import { AttendanceRow } from '@/components/hr/AttendanceRow';

// "Log Daily Attendance" — Admin Staff (Figure 1.1, first task after Cutoff Period Begins)
export default async function AttendancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;
  const canEdit = hasRole(role, ['admin_staff']);

  // employee_directory (migration 0009) exposes only id/code/name/active, so Admin Staff can
  // pick an employee without ever seeing pay rates or bank accounts. (They have no read
  // access to the employees table itself, which is why the old dropdown was empty for them.)
  const { data: directory } = await supabase.from('employee_directory').select('id, full_name, is_active');
  const names = new Map((directory ?? []).map((e: any) => [e.id, e.full_name as string]));
  const activeEmployees = (directory ?? []).filter((e: any) => e.is_active).map((e: any) => ({ id: e.id, full_name: e.full_name }));

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .order('log_date', { ascending: false })
    .limit(50);

  // Date ranges of cutoffs that are already computed/approved/disbursed. Rows inside one are frozen.
  const { data: lockedPeriods } = await supabase.rpc('locked_payroll_periods');
  const isLocked = (date: string) =>
    ((lockedPeriods as { period_start: string; period_end: string }[] | null) ?? []).some(
      (p) => date >= p.period_start && date <= p.period_end
    );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Attendance</h1>
      {canEdit && <AttendanceForm employees={activeEmployees} />}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Employee</th>
            <th>Date</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Hours</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(logs ?? []).map((log: any) => (
            <AttendanceRow
              key={log.id}
              log={log}
              employeeName={names.get(log.employee_id) ?? 'Unknown'}
              canEdit={canEdit}
              locked={isLocked(log.log_date)}
            />
          ))}
          {(logs ?? []).length === 0 && (
            <tr><td colSpan={6} className="py-4 text-muted-foreground">No attendance logged yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
