# JJPG Trading

A web-based ERP covering JJPG Trading's four Phase-1 priority processes:

| # | Process | Department | Replaces |
|---|---------|-----------|----------|
| 1 | Salary Distribution | HR & Administration | Manual attendance + hand-computed payroll |
| 2 | Warehouse Recording | Warehouse Operations | Paper stock cards |
| 3 | Trucking Logistics | Delivery & Logistics | Verbal/paper dispatch and trip tickets |
| 4 | Storage Location | Warehouse Operations | Memory-based bin lookup |

This repo is the **to-be** system: it digitizes the as-is flowchart/BPMN/swimlane processes
documented in `docs/process-flows/`, using each process's master data (Item/SKU Master,
Delivery-Asset/Truck Master, Storage Location Master, Employee Master) as the shared,
real-time data source described in the project's root-cause analysis.

## Stack

- **Next.js 14** (App Router, TypeScript, Server Components + Server Actions)
- **Supabase** — Postgres, Auth, Row-Level Security, Storage (for payslips/trip-ticket PDFs)
- **Tailwind CSS + shadcn/ui** for the interface
- **Zod + React Hook Form** for validation
- **Vercel** for hosting, **Supabase Cloud** for the database

## Why this stack maps to the document

- Every master data object called out in the doc (Item/SKU Master, Truck Master, Storage
  Location Master, Employee Master) becomes a Postgres table with foreign keys, so
  "shared, real-time data source" is enforced at the database level, not by convention.
- Every human handoff (Admin Staff → HR/Payroll Officer → Management → Finance, etc.)
  becomes a role + Row-Level Security policy, so the system — not a paper trail — is what
  moves work from one lane to the next.
- Every XOR gateway in the BPMN diagrams (Cutoff Reached?, Approved by Management?, Entry
  Matches Physical Count?, Delivery Confirmed?, Truck Due for Maintenance?, Location Already
  Assigned?) becomes an explicit status field and conditional branch in the relevant Server
  Action, so the as-is decision logic is preserved 1:1 in the to-be system.

## Getting started

```bash
git clone <your-repo-url>
cd ERP-ITS152
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push               # applies everything in supabase/migrations
npm run dev
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system layers, auth, RLS strategy
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — every table, mapped to the process it supports
- [`docs/ROLES_AND_PERMISSIONS.md`](docs/ROLES_AND_PERMISSIONS.md) — the roles from the doc → app roles → RLS
- [`docs/REPO_STRUCTURE.md`](docs/REPO_STRUCTURE.md) — full folder tree, explained
- [`docs/process-flows/`](docs/process-flows/) — each process's as-is flow re-expressed as system screens + statuses

## Suggested build order

1. Auth + roles + `profiles` table (everyone needs to log in as *someone*)
2. Storage Location (smallest, 3 lanes, no external dependencies)
3. Warehouse Recording (depends on Item/SKU Master + Storage Location)
4. Trucking Logistics (depends on Truck Master; independent of Warehouse)
5. Salary Distribution (independent of the other three; safe to build in parallel)

This order front-loads the smallest process so you get a full vertical slice (DB → RLS →
Server Action → UI) working early, then reuses that pattern for the rest.
