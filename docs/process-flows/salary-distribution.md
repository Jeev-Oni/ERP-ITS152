# Salary Distribution → System Implementation

Source: Figures 1.1–1.3 (Flowchart, BPMN, Swimlane).

| As-is step | Role | System screen | Server Action | Status transition |
|---|---|---|---|---|
| Cutoff Period Begins | HR/Payroll Officer | `/hr/payroll` | `createPayrollCutoff()` | `— → open` |
| Log Daily Attendance | Admin Staff | `/hr/attendance` | `logAttendance()` | — (feeds `attendance_logs`) |
| Cutoff Reached? | HR/Payroll Officer | `/hr/payroll/[id]` | `closeCutoff()` | `open → closed` |
| Compute Hours, OT & Deductions | HR/Payroll Officer | `/hr/payroll/[id]` | `computePayroll()` | `closed → computed` |
| Generate Digital Payslip | HR/Payroll Officer | `/hr/payslips` (from `/hr/payroll/[id]`) | `generatePayslips()` | — |
| Approved by Management? | Management | `/hr/payroll` (approval panel) | `approvePayroll()` / `rejectPayroll()` | `computed → pending_approval → approved` or `→ revision_needed` |
| Revise Computation | HR/Payroll Officer | `/hr/payroll` | `computePayroll()` (re-run) | `revision_needed → computed` |
| Disburse Pay via Bank Transfer | Finance | `/hr/payroll` (disburse action) | `disbursePay()` | `approved → disbursed` |
| Update Employee Master Record | Finance | (automatic) | part of `disbursePay()` | — |

## Notes for implementation

- The flowchart draws "Cutoff Reached?" as an automatic check against the calendar. This
  implementation makes it a manual `closeCutoff()` action by HR/Payroll Officer instead —
  simpler to build and test than a scheduled job, at the cost of relying on a human to close
  the window on time. Swap in a `pg_cron` job calling the same status update once that
  matters more than development speed.
- `computePayroll()` is a real computation now: it sums `attendance_logs.hours_worked` per
  employee within the cutoff's date range, splits each day into regular (≤8h) and overtime
  (>8h), and applies a 1.25× overtime multiplier — a placeholder company policy constant,
  not a labor-law citation. Deductions default to 0 and are edited per employee afterward
  via `updateComputationDeductions()`, since SSS/PhilHealth/Pag-IBIG/tax/cash-advance rules
  are company-specific and weren't in scope of the source document.
- The doc flags the Management approval as a **bottleneck**, not a handoff delay — a single
  approver everyone queues behind. Consider letting `management` bulk-approve multiple
  employees' payslips in one action rather than one-by-one, since the fix here is throughput,
  not more handoffs.
- `disbursePay()` should be idempotent — re-running it for an already-`disbursed` cutoff
  should be a no-op, since bank transfers can't be un-sent.
- Payslip PDFs go to Supabase Storage under `payslips/{employee_id}/{cutoff_id}.pdf`, with a
  storage policy restricting read access to the employee themselves, HR, and Finance.
