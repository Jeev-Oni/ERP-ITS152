-- 0007_rls_policies.sql
-- One block per process. Each policy comment points back to the BPMN task / swimlane
-- handoff it implements, so this file doubles as a readable permissions map.

-- ============================================================
-- PROCESS 1: SALARY DISTRIBUTION
-- ============================================================

-- Employee Master: HR, Management, Finance can read; only HR/Payroll can write.
create policy "employees_read" on employees for select to authenticated
  using (current_role() in ('hr_payroll_officer','management','finance','system_admin'));
create policy "employees_write" on employees for all to authenticated
  using (current_role() in ('hr_payroll_officer','system_admin'))
  with check (current_role() in ('hr_payroll_officer','system_admin'));

-- "Log Daily Attendance" — Admin Staff
create policy "attendance_write_admin_staff" on attendance_logs for insert to authenticated
  with check (current_role() in ('admin_staff','system_admin'));
create policy "attendance_read" on attendance_logs for select to authenticated
  using (current_role() in ('admin_staff','hr_payroll_officer','management','system_admin'));

-- "Compute Hours, OT & Deductions" — HR/Payroll Officer only
create policy "payroll_computations_write" on payroll_computations for all to authenticated
  using (current_role() in ('hr_payroll_officer','system_admin'))
  with check (current_role() in ('hr_payroll_officer','system_admin'));

-- "Generate Digital Payslip" — HR/Payroll Officer
create policy "payslips_write" on payslips for insert to authenticated
  with check (current_role() in ('hr_payroll_officer','system_admin'));
create policy "payslips_read" on payslips for select to authenticated
  using (current_role() in ('hr_payroll_officer','management','finance','system_admin'));

-- "Approved by Management?" gateway — the handoff the doc calls a bottleneck.
create policy "payroll_approvals_management_only" on payroll_approvals for insert to authenticated
  with check (current_role() in ('management','system_admin'));
create policy "payroll_approvals_read" on payroll_approvals for select to authenticated
  using (current_role() in ('hr_payroll_officer','management','finance','system_admin'));

-- "Disburse Pay via Bank Transfer" — Finance only
create policy "payroll_disbursements_finance_only" on payroll_disbursements for insert to authenticated
  with check (current_role() in ('finance','system_admin'));
create policy "payroll_disbursements_read" on payroll_disbursements for select to authenticated
  using (current_role() in ('hr_payroll_officer','management','finance','system_admin'));

create policy "payroll_cutoffs_read" on payroll_cutoffs for select to authenticated
  using (current_role() in ('hr_payroll_officer','management','finance','system_admin'));
create policy "payroll_cutoffs_write" on payroll_cutoffs for all to authenticated
  using (current_role() in ('hr_payroll_officer','system_admin'))
  with check (current_role() in ('hr_payroll_officer','system_admin'));

-- ============================================================
-- PROCESS 2: WAREHOUSE RECORDING
-- ============================================================

create policy "items_read" on items for select to authenticated
  using (current_role() in ('warehouse_staff','warehouse_supervisor','system_admin'));
create policy "items_write_supervisor" on items for insert to authenticated
  with check (current_role() in ('warehouse_supervisor','system_admin'));

-- "Receive..." / "Pick..." — Warehouse Staff / Inventory Clerk
create policy "stock_movements_write_staff" on stock_movements for insert to authenticated
  with check (current_role() in ('warehouse_staff','system_admin'));
create policy "stock_movements_read" on stock_movements for select to authenticated
  using (current_role() in ('warehouse_staff','warehouse_supervisor','system_admin'));

-- "Entry Matches Physical Count?" + "Supervisor Verifies & Closes Audit Trail"
create policy "stock_movements_verify_supervisor" on stock_movements for update to authenticated
  using (current_role() in ('warehouse_supervisor','system_admin'))
  with check (current_role() in ('warehouse_supervisor','system_admin'));

create policy "stock_ledger_read" on stock_ledger for select to authenticated
  using (current_role() in ('warehouse_staff','warehouse_supervisor','finance','system_admin'));
-- No insert policy for stock_ledger: it is written only by the apply_stock_movement()
-- trigger (security definer), never directly by a client — this enforces "System task."

-- "Investigate & Correct Discrepancy" — Warehouse Supervisor
create policy "discrepancies_supervisor" on stock_discrepancies for all to authenticated
  using (current_role() in ('warehouse_supervisor','system_admin'))
  with check (current_role() in ('warehouse_supervisor','system_admin'));

-- ============================================================
-- PROCESS 3: TRUCKING LOGISTICS
-- ============================================================

create policy "trucks_read" on trucks for select to authenticated
  using (current_role() in ('dispatcher','driver','fleet_supervisor','system_admin'));
create policy "trucks_write_fleet_supervisor" on trucks for all to authenticated
  using (current_role() in ('fleet_supervisor','system_admin'))
  with check (current_role() in ('fleet_supervisor','system_admin'));

create policy "drivers_read" on drivers for select to authenticated
  using (current_role() in ('dispatcher','fleet_supervisor','system_admin'));

-- "Plan Route & Assign Truck/Driver" + "Report Issue & Reschedule Trip" — Dispatcher
create policy "trips_write_dispatcher" on trips for insert to authenticated
  with check (current_role() in ('dispatcher','system_admin'));
create policy "trips_read" on trips for select to authenticated
  using (current_role() in ('dispatcher','driver','fleet_supervisor','system_admin'));

-- "Driver Departs" / "Arrive at Client Site" — Driver updates their own assigned trip
create policy "trips_update_driver" on trips for update to authenticated
  using (
    current_role() in ('driver','system_admin')
    and exists (
      select 1 from drivers d
      where d.id = trips.driver_id and d.profile_id = auth.uid()
    )
  );

-- "Update Trip & Maintenance Log" — Fleet Supervisor
create policy "trips_close_fleet_supervisor" on trips for update to authenticated
  using (current_role() in ('fleet_supervisor','system_admin'));

create policy "trip_tickets_read" on trip_tickets for select to authenticated
  using (current_role() in ('dispatcher','driver','fleet_supervisor','system_admin'));
create policy "trip_tickets_write_dispatcher" on trip_tickets for insert to authenticated
  with check (current_role() in ('dispatcher','system_admin'));

-- "Capture Delivery Confirmation" — Driver
create policy "delivery_confirmations_write_driver" on delivery_confirmations for insert to authenticated
  with check (current_role() in ('driver','system_admin'));
create policy "delivery_confirmations_read" on delivery_confirmations for select to authenticated
  using (current_role() in ('dispatcher','driver','fleet_supervisor','system_admin'));

-- "Schedule Fleet Maintenance" — Fleet Supervisor
create policy "maintenance_schedule_fleet_supervisor" on maintenance_schedule for all to authenticated
  using (current_role() in ('fleet_supervisor','system_admin'))
  with check (current_role() in ('fleet_supervisor','system_admin'));

-- ============================================================
-- PROCESS 4: STORAGE LOCATION
-- ============================================================

create policy "storage_locations_read" on storage_locations for select to authenticated
  using (current_role() in ('warehouse_staff','warehouse_supervisor','system_admin'));
create policy "storage_locations_write_supervisor" on storage_locations for insert to authenticated
  with check (current_role() in ('warehouse_supervisor','system_admin'));

-- "Assign New Storage Location/Bin" / "Retrieve Assigned Bin Location" — Warehouse Staff
create policy "item_location_map_write_staff" on item_location_map for all to authenticated
  using (current_role() in ('warehouse_staff','system_admin'))
  with check (current_role() in ('warehouse_staff','system_admin'));
create policy "item_location_map_read" on item_location_map for select to authenticated
  using (current_role() in ('warehouse_staff','warehouse_supervisor','system_admin'));

-- "Supervisor Audits Location Accuracy (Periodic)" — Warehouse Supervisor
create policy "location_audits_supervisor" on location_audits for all to authenticated
  using (current_role() in ('warehouse_supervisor','system_admin'))
  with check (current_role() in ('warehouse_supervisor','system_admin'));
