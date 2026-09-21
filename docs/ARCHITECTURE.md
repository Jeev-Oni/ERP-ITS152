# Architecture

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React Server + Client Components)              │
├─────────────────────────────────────────────────────────┤
│  Next.js App Router                                       │
│   - Server Components: read data (per-module pages)       │
│   - Server Actions: writes (log attendance, confirm       │
│     delivery, approve payroll, etc.) — one per BPMN task   │
│   - Route Handlers (src/app/api/*): webhooks + exports     │
├─────────────────────────────────────────────────────────┤
│  Supabase                                                  │
│   - Postgres (tables mirror the four processes)            │
│   - Auth (email/password or magic link → profiles table)   │
│   - Row-Level Security (role-based, mirrors swimlanes)      │
│   - Storage (payslip PDFs, signed delivery confirmations)   │
└─────────────────────────────────────────────────────────┘
```

## Why Server Actions, not a separate API

Each task box in the BPMN diagrams (e.g. "Compute Hours, OT & Deductions — HR/Payroll
Officer") maps to exactly one Server Action (e.g. `computePayroll()`), which:

1. Checks the caller's role against the role labeled on that BPMN task.
2. Performs the write inside a Postgres transaction.
3. Advances a `status` column that represents "which lane the record is currently in."

This keeps the as-is process logic in one place per task, instead of scattering it across
API routes and client-side checks.

## Status-driven state machines

Every process in the document has at least one XOR gateway. Rather than modeling BPMN
gateways as a separate table, each entity gets a `status` enum whose values are the
diamonds from the flowcharts, and the *only* way to move between statuses is through the
Server Action tied to that transition. Examples:

- `payroll_cutoffs.status`: `open → computed → pending_approval → approved → disbursed` (or `→ revision_needed → computed`, replaying the "Approved by Management?" loop)
- `stock_movements.status`: `pending → logged → verified` (or `→ discrepancy → investigating → verified`)
- `trips.status`: `dispatched → in_transit → delivered` (or `→ delivery_failed → rescheduled`)
- `storage_assignments`: no status needed — it's a single-decision lookup, not a multi-step flow (matches the doc's observation that this process has the fewest handoffs)

## Auth & Role Model

Supabase Auth issues a `user_id` (UUID). A `profiles` table extends it with a `role` and
`department`, matching the "Key roles" list under each process in the document:

```
profiles.role ∈ {
  admin_staff, hr_payroll_officer, management, finance,
  warehouse_staff, warehouse_supervisor,
  dispatcher, driver, fleet_supervisor,
  system_admin
}
```

RLS policies gate reads/writes by role, so — for example — only `management` can transition
a `payroll_cutoffs` row from `pending_approval` to `approved`. See
[`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md) for the full matrix.

## Audit trail

The document repeatedly flags paper-based work and duplicate re-entry as the root problem.
Every table that represents a handoff point writes to a shared `audit_log` table (who, what,
old status → new status, when) via a Postgres trigger — this is the digital equivalent of the
"Supervisor Verifies & Closes Audit Trail" step in Warehouse Recording, generalized to all
four processes.

## Environments

- `main` branch → Supabase **production** project, deployed to Vercel production
- `develop` branch → Supabase **staging** project, deployed to a Vercel preview
- Feature branches → local Supabase (`supabase start`, Docker) + Vercel preview deploys

## Master data (the "shared, real-time data source")

| Master | Table | Used by |
|---|---|---|
| Employee Master | `employees` | Salary Distribution |
| Item/SKU Master | `items` | Warehouse Recording, Storage Location |
| Delivery-Asset (Truck) Master | `trucks` | Trucking Logistics |
| Storage Location Master | `storage_locations` | Storage Location, Warehouse Recording |
