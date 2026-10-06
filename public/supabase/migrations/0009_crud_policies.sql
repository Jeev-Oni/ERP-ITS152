-- 0009_crud_policies.sql
-- Completes Create / Read / Update / Delete across all four processes.
--
-- Part A  - the missing UPDATE / DELETE policies (and the guards that make them safe).
-- Part B  - fixes for existing flows that RLS was silently blocking. An RLS-denied
--           UPDATE does not raise an error, it just touches 0 rows, so these looked
--           like they worked in the UI while doing nothing.
--
-- Safe to re-run: every policy is dropped before it is (re)created.

-- ============================================================
-- HELPERS
-- ============================================================

-- Attendance is the input to payroll, so it must freeze once payroll has been computed
-- for that period. It stays editable while the cutoff is open, closed (not yet computed)
-- or revision_needed (Management bounced it - fixing attendance is often the reason).
-- security definer: admin_staff cannot read payroll_cutoffs themselves.
create or replace function public.is_attendance_locked(p_date date)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from payroll_cutoffs c
    where p_date between c.period_start and c.period_end
      and c.status in ('computed', 'pending_approval', 'approved', 'disbursed')
  );
$$;

-- Same rule, as date ranges, so the UI can grey out locked rows in one query.
create or replace function public.locked_payroll_periods()
returns table (period_start date, period_end date)
language sql stable security definer
set search_path = public
as $$
  select c.period_start, c.period_end from payroll_cutoffs c
  where c.status in ('computed', 'pending_approval', 'approved', 'disbursed');
$$;

revoke execute on function public.is_attendance_locked(date) from public, anon;
revoke execute on function public.locked_payroll_periods() from public, anon;
grant execute on function public.is_attendance_locked(date) to authenticated;
grant execute on function public.locked_payroll_periods() to authenticated;

-- Admin Staff must pick an employee when logging attendance but must NOT see pay rates
-- or bank accounts, and RLS cannot hide columns. This view exposes only safe columns and
-- filters by role itself (views run with the owner's rights, so they bypass table RLS).
create or replace view public.employee_directory as
  select id, employee_code, full_name, position, is_active
  from public.employees
  where public.current_app_role() in
    ('admin_staff', 'hr_payroll_officer', 'management', 'finance', 'system_admin');

revoke all on public.employee_directory from anon;
grant select on public.employee_directory to authenticated;

-- ============================================================
-- PART A - CRUD POLICIES
-- ============================================================

-- ---------- Process 1: Salary Distribution ----------

-- employees: already "for all" for hr_payroll_officer / system_admin (0007). No change.

-- attendance_logs: Admin Staff can correct or remove their own entries, but not once
-- the period is locked. Insert gets the same lock so nothing slips into a computed period.
drop policy if exists "attendance_write_admin_staff" on attendance_logs;
create policy "attendance_write_admin_staff" on attendance_logs for insert to authenticated
  with check (
    current_app_role() in ('admin_staff', 'system_admin')
    and not is_attendance_locked(log_date)
  );

drop policy if exists "attendance_update_admin_staff" on attendance_logs;
create policy "attendance_update_admin_staff" on attendance_logs for update to authenticated
  using (current_app_role() in ('admin_staff', 'system_admin') and not is_attendance_locked(log_date))
  with check (current_app_role() in ('admin_staff', 'system_admin') and not is_attendance_locked(log_date));

drop policy if exists "attendance_delete_admin_staff" on attendance_logs;
create policy "attendance_delete_admin_staff" on attendance_logs for delete to authenticated
  using (current_app_role() in ('admin_staff', 'system_admin') and not is_attendance_locked(log_date));

-- payroll_cutoffs: 0007 had one "for all" policy, which let HR DELETE a disbursed cutoff
-- (cascading to its computations, approvals and payslips). Split it up so delete is only
-- possible while the cutoff is still 'open'.
drop policy if exists "payroll_cutoffs_write" on payroll_cutoffs;

drop policy if exists "payroll_cutoffs_insert" on payroll_cutoffs;
create policy "payroll_cutoffs_insert" on payroll_cutoffs for insert to authenticated
  with check (current_app_role() in ('hr_payroll_officer', 'system_admin'));

drop policy if exists "payroll_cutoffs_update_hr" on payroll_cutoffs;
create policy "payroll_cutoffs_update_hr" on payroll_cutoffs for update to authenticated
  using (current_app_role() in ('hr_payroll_officer', 'system_admin'))
  with check (current_app_role() in ('hr_payroll_officer', 'system_admin'));

drop policy if exists "payroll_cutoffs_delete_open_only" on payroll_cutoffs;
create policy "payroll_cutoffs_delete_open_only" on payroll_cutoffs for delete to authenticated
  using (current_app_role() in ('hr_payroll_officer', 'system_admin') and status = 'open');

-- ---------- Process 2: Warehouse Recording ----------

drop policy if exists "items_update_supervisor" on items;
create policy "items_update_supervisor" on items for update to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'))
  with check (current_app_role() in ('warehouse_supervisor', 'system_admin'));

drop policy if exists "items_delete_supervisor" on items;
create policy "items_delete_supervisor" on items for delete to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'));

-- current_balance may only ever change through apply_stock_movement() (security definer,
-- runs as the table owner, so unaffected by this). Without this, the new update policy
-- would let a client overwrite the balance and break the ledger.
revoke update on items from authenticated, anon;
grant update (sku, name, unit, reorder_point) on items to authenticated;

-- stock_movements / stock_ledger stay append-only on purpose: they are the audit trail.

-- ---------- Process 4: Storage Location ----------

drop policy if exists "storage_locations_update_supervisor" on storage_locations;
create policy "storage_locations_update_supervisor" on storage_locations for update to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'))
  with check (current_app_role() in ('warehouse_supervisor', 'system_admin'));

drop policy if exists "storage_locations_delete_supervisor" on storage_locations;
create policy "storage_locations_delete_supervisor" on storage_locations for delete to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'));

-- Supervisor maintains location accuracy, so they can also clear a stale assignment.
-- (Staff already have "for all" on item_location_map from 0007.)
drop policy if exists "item_location_map_delete_supervisor" on item_location_map;
create policy "item_location_map_delete_supervisor" on item_location_map for delete to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'));

-- ---------- Process 3: Trucking Logistics ----------

-- trucks and maintenance_schedule are already "for all" for fleet_supervisor (0007).

-- drivers had a read policy and nothing else, so no one could add or edit a driver.
drop policy if exists "drivers_write_fleet_supervisor" on drivers;
create policy "drivers_write_fleet_supervisor" on drivers for all to authenticated
  using (current_app_role() in ('fleet_supervisor', 'system_admin'))
  with check (current_app_role() in ('fleet_supervisor', 'system_admin'));

-- Dispatcher may amend or cancel a trip only before the driver departs.
-- with check pins status to 'dispatched' so this can't be used to skip the state machine.
drop policy if exists "trips_update_dispatcher" on trips;
create policy "trips_update_dispatcher" on trips for update to authenticated
  using (current_app_role() in ('dispatcher', 'system_admin') and status = 'dispatched')
  with check (current_app_role() in ('dispatcher', 'system_admin') and status = 'dispatched');

drop policy if exists "trips_delete_dispatcher" on trips;
create policy "trips_delete_dispatcher" on trips for delete to authenticated
  using (current_app_role() in ('dispatcher', 'system_admin') and status = 'dispatched');

-- ============================================================
-- PART B - FIXES FOR EXISTING FLOWS (silently blocked by RLS)
-- ============================================================

-- B1. Drivers could not read the drivers table, so (a) "Your Trips" was always empty and
--     (b) trips_update_driver's EXISTS(select from drivers) could never be true, meaning a
--     driver could never start a trip or confirm delivery. Let a driver read their own row.
drop policy if exists "drivers_read_self" on drivers;
create policy "drivers_read_self" on drivers for select to authenticated
  using (profile_id = auth.uid());

-- B2. Management approving / rejecting payroll updates payroll_cutoffs.status, but only HR
--     had an update policy, so the status never moved. One policy per handoff, each pinned
--     to the exact transition the BPMN diagram allows.
drop policy if exists "payroll_cutoffs_update_management" on payroll_cutoffs;
create policy "payroll_cutoffs_update_management" on payroll_cutoffs for update to authenticated
  using (current_app_role() = 'management' and status = 'computed')
  with check (current_app_role() = 'management' and status in ('approved', 'revision_needed'));

-- B3. Same problem for Finance marking an approved cutoff as disbursed.
drop policy if exists "payroll_cutoffs_update_finance" on payroll_cutoffs;
create policy "payroll_cutoffs_update_finance" on payroll_cutoffs for update to authenticated
  using (current_app_role() = 'finance' and status = 'approved')
  with check (current_app_role() = 'finance' and status = 'disbursed');

-- B4. recordMovement() inserts a 'pending' movement then flips it to 'logged' to fire the
--     balance trigger, but Warehouse Staff had no update policy, so it stayed 'pending'
--     forever and the stock balance never moved. Allow exactly that one transition, on
--     their own pending rows.
drop policy if exists "stock_movements_log_staff" on stock_movements;
create policy "stock_movements_log_staff" on stock_movements for update to authenticated
  using (current_app_role() = 'warehouse_staff' and status = 'pending' and logged_by = auth.uid())
  with check (current_app_role() = 'warehouse_staff' and status = 'logged' and logged_by = auth.uid());
