-- 0003_salary_distribution.sql
-- Process 1: Salary Distribution (Figures 1.1-1.3)

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null,
  full_name text not null,
  position text,
  daily_rate numeric(10,2) not null,
  bank_account_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- "Log Daily Attendance" — Admin Staff
create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  log_date date not null,
  time_in time,
  time_out time,
  hours_worked numeric(4,2),
  logged_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  unique (employee_id, log_date)
);

-- One row per payroll cutoff period; carries the state machine.
create table payroll_cutoffs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status payroll_cutoff_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (period_start, period_end)
);

-- "Compute Hours, OT & Deductions" — HR/Payroll Officer
create table payroll_computations (
  id uuid primary key default gen_random_uuid(),
  payroll_cutoff_id uuid not null references payroll_cutoffs (id) on delete cascade,
  employee_id uuid not null references employees (id),
  regular_hours numeric(6,2) not null default 0,
  overtime_hours numeric(6,2) not null default 0,
  deductions numeric(10,2) not null default 0,
  gross_pay numeric(12,2) not null,
  net_pay numeric(12,2) not null,
  computed_by uuid not null references profiles (id),
  computed_at timestamptz not null default now(),
  unique (payroll_cutoff_id, employee_id)
);

-- "Generate Digital Payslip"
create table payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_computation_id uuid not null references payroll_computations (id) on delete cascade,
  storage_path text, -- Supabase Storage path, e.g. payslips/{employee_id}/{cutoff_id}.pdf
  generated_at timestamptz not null default now()
);

-- "Approved by Management?" gateway + "Revise Computation" loop.
-- Every approval attempt is a new row, so the revision history is never overwritten.
create table payroll_approvals (
  id uuid primary key default gen_random_uuid(),
  payroll_cutoff_id uuid not null references payroll_cutoffs (id) on delete cascade,
  decision text not null check (decision in ('approved', 'revision_needed')),
  reason text,
  decided_by uuid not null references profiles (id),
  decided_at timestamptz not null default now()
);

-- "Disburse Pay via Bank Transfer" — Finance
create table payroll_disbursements (
  id uuid primary key default gen_random_uuid(),
  payroll_cutoff_id uuid not null references payroll_cutoffs (id) on delete cascade,
  disbursed_by uuid not null references profiles (id),
  disbursed_at timestamptz not null default now(),
  bank_reference text
);

alter table employees enable row level security;
alter table attendance_logs enable row level security;
alter table payroll_cutoffs enable row level security;
alter table payroll_computations enable row level security;
alter table payslips enable row level security;
alter table payroll_approvals enable row level security;
alter table payroll_disbursements enable row level security;
