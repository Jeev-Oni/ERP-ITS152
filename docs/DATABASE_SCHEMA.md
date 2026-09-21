# Database Schema

Full SQL lives in `supabase/migrations/`. This doc explains *why* each table exists, mapped
back to the document.

## Shared / Auth

### `profiles`
Extends `auth.users`. One row per person, carries the role used by every RLS policy.
| column | type | notes |
|---|---|---|
| id | uuid, PK, FK → auth.users | |
| full_name | text | |
| role | enum `app_role` | see ROLES_AND_PERMISSIONS.md |
| department | enum `department` | HR & Administration / Warehouse Operations / Delivery & Logistics |
| is_active | boolean | |

### `audit_log`
One row per status transition on any tracked table (generic — see ARCHITECTURE.md).

---

## Process 1 — Salary Distribution

| table | purpose | mirrors |
|---|---|---|
| `employees` | Employee Master | — |
| `attendance_logs` | one row per day logged | "Log Daily Attendance" (Admin Staff) |
| `payroll_cutoffs` | one row per cutoff period, holds the state machine | "Cutoff Reached?" gateway |
| `payroll_computations` | hours/OT/deductions per employee per cutoff | "Compute Hours, OT & Deductions" |
| `payslips` | generated payslip records + PDF storage path | "Generate Digital Payslip" |
| `payroll_approvals` | approve/reject + reason, one row per approval attempt | "Approved by Management?" gateway + "Revise Computation" loop |

`payroll_cutoffs.status`: `open → closed → computed → pending_approval → approved → disbursed`
(rejection sends it back to `computed` via a new `payroll_approvals` row with `revise_computation`).

---

## Process 2 — Warehouse Recording

| table | purpose | mirrors |
|---|---|---|
| `items` | Item/SKU Master | — |
| `stock_movements` | one row per receipt or issue | "Receive Raw Materials" / "Pick Item for Outbound Order" |
| `stock_ledger` | append-only balance history per item | "Update Balance on Item/SKU Master" (the System task) |
| `stock_discrepancies` | logged when physical count ≠ ledger | "Investigate & Correct Discrepancy" |

`stock_movements.status`: `pending → logged → matched → verified` (or `→ discrepancy →
investigating → verified`, matching "Entry Matches Physical Count?").

---

## Process 3 — Trucking Logistics

| table | purpose | mirrors |
|---|---|---|
| `trucks` | Delivery-Asset (Truck) Master | — |
| `drivers` | driver roster, FK-able to `profiles` | "Driver" lane |
| `trips` | one row per dispatch, holds the state machine | "Plan Route & Assign Truck/Driver" onward |
| `trip_tickets` | generated ticket doc per trip | "Generate Digital Trip Ticket" |
| `delivery_confirmations` | signature/proof of delivery | "Capture Delivery Confirmation" |
| `maintenance_schedule` | rows created when a trip closes and the truck is due | "Truck Due for Maintenance?" gateway |

`trips.status`: `dispatched → en_route → delivered` (or `→ delivery_failed → rescheduled`,
which spawns a **new** trip row per the doc's note that a rescheduled trip is "a new trip
instance", not a resumed one).

---

## Process 4 — Storage Location

| table | purpose | mirrors |
|---|---|---|
| `storage_locations` | Storage Location Master (bins) | — |
| `item_location_map` | current bin assignment per item | "Assign New Storage Location/Bin" / "Retrieve Assigned Bin Location" |
| `location_audits` | periodic supervisor spot-checks | "Supervisor Audits Location Accuracy (Periodic)" |

No status machine needed here — this table backs a single lookup/assign decision, which is
exactly why the document notes it has the fewest handoffs of the four processes.

---

## Full ER overview

```
employees ──< attendance_logs
employees ──< payroll_computations >── payroll_cutoffs ──< payroll_approvals
payroll_computations ──< payslips

items ──< stock_movements ──< stock_ledger
stock_movements ──< stock_discrepancies
items ──< item_location_map >── storage_locations
storage_locations ──< location_audits

trucks ──< trips >── drivers
trips ──< trip_tickets
trips ──< delivery_confirmations
trips ──< maintenance_schedule >── trucks
```
