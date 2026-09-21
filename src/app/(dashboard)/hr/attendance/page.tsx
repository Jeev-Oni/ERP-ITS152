import { createClient } from '@/lib/supabase/server';
import { AttendanceForm } from '@/components/hr/AttendanceForm';
import { StatusBadge } from '@/components/shared/StatusBadge';

// "Log Daily Attendance" — Admin Staff (Figure 1.1, first task after Cutoff Period Begins)
export default async function AttendancePage() {
  const supabase = createClient();
  const { data: employees } = await supabase.from('employees').select('id, full_name').eq('is_active', true);
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*, employees(full_name)')
    .order('log_date', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Attendance</h1>
      <AttendanceForm employees={employees ?? []} />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Employee</th>
            <th>Date</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {(logs ?? []).map((log: any) => (
            <tr key={log.id} className="border-b">
              <td className="py-2">{log.employees?.full_name}</td>
              <td>{log.log_date}</td>
              <td>{log.time_in ?? '—'}</td>
              <td>{log.time_out ?? '—'}</td>
              <td>{log.hours_worked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
