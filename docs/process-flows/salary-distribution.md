# Salary Distribution → System Implementation

Source: Figures 1.1–1.3 (Flowchart, BPMN, Swimlane).

| As-is step | Role | System screen | Server Action | Status transition |
|---|---|---|---|---|
| Log Daily Attendance | Admin Staff | `/hr/attendance` | `logAttendance()` | — (feeds `attendance_logs`) |
| Cutoff Reached? | system | — | `checkCutoff()` (cron/scheduled) | `payroll_cutoffs.status: open → closed` |
| Compute Hours, OT & Deductions | HR/Payroll Officer | `/hr/payroll` | `computePayroll()` | `closed → computed` |
| Generate Digital Payslip | HR/Payroll Officer | `/hr/payslips` | `generatePayslip()` | — |
| Approved by Management? | Management | `/hr/payroll` (approval panel) | `approvePayroll()` / `rejectPayroll()` | `computed → pending_approval → approved` or `→ revision_needed` |
| Revise Computation | HR/Payroll Officer | `/hr/payroll` | `computePayroll()` (re-run) | `revision_needed → computed` |
| Disburse Pay via Bank Transfer | Finance | `/hr/payroll` (disburse action) | `disbursePay()` | `approved → disbursed` |
| Update Employee Master Record | Finance | (automatic) | part of `disbursePay()` | — |

## Notes for implementation

- The doc flags the Management approval as a **bottleneck**, not a handoff delay — a single
  approver everyone queues behind. Consider letting `management` bulk-approve multiple
  employees' payslips in one action rather than one-by-one, since the fix here is throughput,
  not more handoffs.
- `disbursePay()` should be idempotent — re-running it for an already-`disbursed` cutoff
  should be a no-op, since bank transfers can't be un-sent.
- Payslip PDFs go to Supabase Storage under `payslips/{employee_id}/{cutoff_id}.pdf`, with a
  storage policy restricting read access to the employee themselves, HR, and Finance.
