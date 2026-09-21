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
