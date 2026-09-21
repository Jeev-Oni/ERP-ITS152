# Repository Structure

```
jjpg-erp/
├── .github/
│   └── workflows/
│       └── ci.yml                     # lint + typecheck + build on every PR
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── ROLES_AND_PERMISSIONS.md
│   ├── REPO_STRUCTURE.md              # this file
│   └── process-flows/
│       ├── salary-distribution.md     # as-is steps → system screens/statuses
│       ├── warehouse-recording.md
│       ├── trucking-logistics.md
│       └── storage-location.md
├── supabase/
│   ├── config.toml                    # local dev config (supabase start)
│   ├── seed.sql                       # demo data: employees, items, trucks, bins
│   └── migrations/
│       ├── 0001_extensions_and_enums.sql
│       ├── 0002_profiles_and_auth.sql
│       ├── 0003_salary_distribution.sql
│       ├── 0004_warehouse_recording.sql
│       ├── 0005_storage_location.sql
│       ├── 0006_trucking_logistics.sql
│       ├── 0007_rls_policies.sql
│       └── 0008_audit_log.sql
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # sidebar nav, role-aware
│   │   │   ├── page.tsx               # landing dashboard / KPIs
│   │   │   ├── hr/
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── payroll/page.tsx
│   │   │   │   └── payslips/page.tsx
│   │   │   ├── warehouse/
│   │   │   │   ├── items/page.tsx
│   │   │   │   ├── stock-movements/page.tsx
│   │   │   │   └── storage-locations/page.tsx
│   │   │   ├── logistics/
│   │   │   │   ├── trucks/page.tsx
│   │   │   │   ├── dispatch/page.tsx
│   │   │   │   └── trips/page.tsx
│   │   │   └── admin/
│   │   │       └── users/page.tsx
│   │   ├── api/
│   │   │   ├── attendance/route.ts
│   │   │   ├── payroll/route.ts
│   │   │   ├── stock-movements/route.ts
│   │   │   └── trips/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (button, table, dialog…)
│   │   ├── shared/                    # StatusBadge, DataTable, RoleGate, PageHeader
│   │   ├── hr/                        # AttendanceForm, PayrollApprovalCard, PayslipList
│   │   ├── warehouse/                 # StockMovementForm, DiscrepancyDialog
│   │   └── logistics/                 # TripTicketCard, DeliveryConfirmationForm
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # browser client
│   │   │   ├── server.ts              # server component/action client
│   │   │   └── middleware.ts          # session refresh helper
│   │   ├── actions/                   # Server Actions, one file per process
│   │   │   ├── salary-distribution.ts
│   │   │   ├── warehouse-recording.ts
│   │   │   ├── trucking-logistics.ts
│   │   │   └── storage-location.ts
│   │   ├── validations/               # Zod schemas mirroring the tables above
│   │   └── utils.ts
│   ├── hooks/                         # useRole(), useRealtimeTable()
│   ├── types/
│   │   └── database.types.ts          # generated: npx supabase gen types typescript
│   └── middleware.ts                  # Next.js auth middleware
├── public/
├── .env.local.example
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Version control notes

- **Commit** `supabase/migrations/*` — this is your schema history and doubles as the
  as-is → to-be paper trail for your ERP proposal write-up.
- **Never commit** `.env.local` (real keys) — only `.env.local.example` (placeholders).
- **Do commit** `src/types/database.types.ts` even though it's generated, so teammates
  don't need a local Supabase project just to get type-checking working.
- Treat each `docs/process-flows/*.md` as living documentation: update it in the same PR
  that changes the corresponding Server Action, so the docs never drift from the code —
  this is the same "single source of truth" principle the original ERP proposal argues for.
