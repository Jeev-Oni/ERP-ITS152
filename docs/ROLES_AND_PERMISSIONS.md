# Roles & Permissions

Roles are taken directly from the "Key roles" list under each process in the source
document, plus one technical role (`system_admin`) for user management.

| `app_role` enum value | From process | Can do |
|---|---|---|
| `admin_staff` | Salary Distribution | Log daily attendance |
| `hr_payroll_officer` | Salary Distribution | Compute payroll, generate payslips, revise on rejection |
| `management` | Salary Distribution | Approve/reject payslips before disbursement |
| `finance` | Salary Distribution | Disburse pay, update employee master record |
| `warehouse_staff` | Warehouse Recording, Storage Location | Log stock movements, assign/retrieve bin locations |
| `warehouse_supervisor` | Warehouse Recording, Storage Location | Verify entries, investigate discrepancies, audit location accuracy |
| `dispatcher` | Trucking Logistics | Plan routes, assign truck/driver, generate trip tickets, reschedule failed deliveries |
| `driver` | Trucking Logistics | Depart, arrive, capture delivery confirmation |
| `fleet_supervisor` | Trucking Logistics | Update trip & maintenance log, schedule maintenance |
| `system_admin` | — | Manage user accounts and role assignments |

## RLS pattern

Every table enforces the *same* two rules everywhere possible, so the policies stay
predictable across all four processes:

1. **Read**: anyone in the owning department can read; cross-department reads are explicit
   (e.g. `finance` can read `payroll_computations` but not `stock_movements`).
2. **Write / status transition**: only the role labeled on that BPMN task can perform it.
   Concretely, this is enforced with policies like:

```sql
-- Only Management can move a payroll_cutoff from pending_approval → approved/revision_needed
create policy "management_approves_payroll"
on payroll_approvals for insert
to authenticated
with check (
  (select role from profiles where id = auth.uid()) = 'management'
);
```

See `supabase/migrations/0007_rls_policies.sql` for the full set — one policy block per
process, each with a comment pointing back to the BPMN task it implements.

## Handoff = policy boundary

The document calls out handoffs as the highest-risk points (e.g. the single Management
approver in Salary Distribution, or the four-lane chain in Trucking Logistics). In this
schema, a handoff is literally the point where write permission on the *next* status value
moves from one role to another — so `grep`-ing the RLS file for a table shows you every
handoff in that process at a glance.

## CRUD matrix

Added in `supabase/migrations/0009_crud_policies.sql`. "Own role" means the role named on the
BPMN task; `system_admin` can do everything its role-owner can. Every Update/Delete server
action calls `.select('id')` and reports zero affected rows, because an RLS-denied UPDATE
or DELETE does not raise an error.

| Data | Create | Update | Delete | Rule that protects the record |
|---|---|---|---|---|
| Employees | HR/Payroll | HR/Payroll | HR/Payroll | Delete refused if the employee has attendance/payroll history, use Deactivate |
| Attendance | Admin Staff or HR | Admin Staff or HR | Admin Staff or HR | Frozen once the covering cutoff is `computed`/`pending_approval`/`approved`/`disbursed` (`is_attendance_locked()`); still editable while `open`, `closed`, or `revision_needed`. HR can unlock a computed period with "Send Back for Correction" |
| Payroll cutoffs | HR/Payroll | HR/Payroll (dates, `open` only) | HR/Payroll (`open` only) | Computed/approved/disbursed cutoffs are permanent payroll records |
| Items (SKU) | Warehouse Supervisor | Warehouse Staff or Supervisor: sku, name, unit, reorder point | Supervisor | `current_balance` is not editable by anyone (column privilege); delete refused with stock on hand or any movement history |
| Stock movements | Warehouse Staff | status transitions only (log, verify) | Supervisor: any. Staff: own entries until verified | Deleting a movement that already changed the balance automatically reverses it, and is refused if that would make stock negative. Every deletion is written to `audit_log` |
| Storage bins | Warehouse Supervisor | Supervisor | Supervisor | FK blocks delete while items are assigned |
| Item to bin assignment | Warehouse Staff | Warehouse Staff (move) | Staff or Supervisor (unassign) | none |
| Trucks | Fleet Supervisor | Fleet Supervisor | Fleet Supervisor | Delete refused if trip/maintenance history, use Deactivate |
| Drivers | Fleet Supervisor | Fleet Supervisor (System Admin links the login) | Fleet Supervisor | Delete refused if trip history, use Deactivate |
| Trips | Dispatcher | Dispatcher, only while `dispatched` | Dispatcher, only while `dispatched` | After departure a trip is audit trail; failed deliveries are rescheduled as a *new* trip |
| Maintenance jobs | Fleet Supervisor | date change while `scheduled` | only when `cancelled` | Completed jobs are kept as maintenance history |
| User accounts | System Admin | System Admin: name, email, role, department, password, active | none (Deactivate) | Admins can't demote or deactivate themselves. Deactivating blocks sign-in **and** revokes all data access (migration 0011) |

## Fixes bundled in migration 0009

These flows were silently blocked by RLS before (each returned 0 rows with no error):

- Management approve/reject and Finance disburse could not update `payroll_cutoffs.status`.
- Warehouse Staff could not flip a movement from `pending` to `logged`, so the balance trigger never fired.
- Drivers could not read their own `drivers` row, so "Your Trips" was empty and they could not start or confirm a trip.
- Admin Staff could not read `employees`, so the attendance dropdown was empty. They now read the
  `employee_directory` view (id, code, name, active only; no pay data).
- HR could delete a *disbursed* payroll cutoff, cascading to its payslips.

## Added in migration 0010

- HR can correct attendance (same lock rule as before).
- Warehouse Staff can edit an item's SKU/name/unit/reorder point. Adding and deleting items stays with the Supervisor, and `current_balance` is still untypeable by anyone.
- Stock movements can be deleted (see matrix). `audit_log` gained a `detail` column so a deletion records what was removed.
- Every screen that is view-only for the signed-in role now says so and names the role that can edit it.

## Added in migration 0011

- `current_app_role()` now returns NULL for an inactive profile, so a deactivated account loses access to every table at once. Before this, `is_active` was never checked anywhere.
- The `profiles` admin policies no longer query `profiles` from inside a policy on `profiles` (Postgres rejects that as infinite recursion). They ask `current_app_role()` instead.
