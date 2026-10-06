-- 0010_crud_adjustments.sql
-- Follow-up to 0009, after real use showed three rules were too tight:
--   1. HR could not correct attendance (only Admin Staff could).
--   2. Warehouse Staff could not fix an Item/SKU typo (only the Supervisor could).
--   3. A mistaken stock movement could never be removed.
-- Safe to re-run: every policy is dropped before it is (re)created.

-- ============================================================
-- 1. Attendance: HR / Payroll Officer may correct entries too.
--    Same freeze rule as before: nothing changes once payroll for that date is computed
--    (HR can unfreeze a period with "Send back for correction" on the cutoff).
-- ============================================================
drop policy if exists "attendance_write_admin_staff" on attendance_logs;
create policy "attendance_write_admin_staff" on attendance_logs for insert to authenticated
  with check (
    current_app_role() in ('admin_staff', 'hr_payroll_officer', 'system_admin')
    and not is_attendance_locked(log_date)
  );

drop policy if exists "attendance_update_admin_staff" on attendance_logs;
create policy "attendance_update_admin_staff" on attendance_logs for update to authenticated
  using (current_app_role() in ('admin_staff', 'hr_payroll_officer', 'system_admin') and not is_attendance_locked(log_date))
  with check (current_app_role() in ('admin_staff', 'hr_payroll_officer', 'system_admin') and not is_attendance_locked(log_date));

drop policy if exists "attendance_delete_admin_staff" on attendance_logs;
create policy "attendance_delete_admin_staff" on attendance_logs for delete to authenticated
  using (current_app_role() in ('admin_staff', 'hr_payroll_officer', 'system_admin') and not is_attendance_locked(log_date));

-- ============================================================
-- 2. Items: Warehouse Staff may edit (sku, name, unit, reorder point).
--    Creating and deleting items stays with the Supervisor. current_balance is still
--    protected by the column privilege from 0009.
-- ============================================================
drop policy if exists "items_update_supervisor" on items;
create policy "items_update_supervisor" on items for update to authenticated
  using (current_app_role() in ('warehouse_staff', 'warehouse_supervisor', 'system_admin'))
  with check (current_app_role() in ('warehouse_staff', 'warehouse_supervisor', 'system_admin'));

-- ============================================================
-- 3. Stock movements: delete, with the balance automatically put back.
-- ============================================================

-- audit_log only recorded status changes. Deleting a row would leave no trace of WHAT was
-- deleted, so give it a free-text detail column.
alter table audit_log add column if not exists detail text;

-- A movement that is no longer 'pending' has already changed items.current_balance
-- (apply_stock_movement fires on pending -> logged). Deleting it must undo that, or the
-- balance silently drifts from the movements that are left.
create or replace function public.reverse_stock_movement()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_before numeric(12,2);
  v_after  numeric(12,2);
  v_sku    text;
begin
  select current_balance, sku into v_before, v_sku
  from items where id = old.item_id
  for update;

  if old.status <> 'pending' then
    if old.movement_type = 'receipt' then
      v_after := v_before - old.quantity;   -- the stock that came in is taken back out
    else
      v_after := v_before + old.quantity;   -- the stock that went out is put back
    end if;

    if v_after < 0 then
      raise exception
        'Cannot delete this receipt of % %: only % is in stock now, so removing it would make the balance negative. Delete or correct the later issues first.',
        old.quantity, v_sku, v_before;
    end if;

    update items set current_balance = v_after where id = old.item_id;
  end if;

  insert into audit_log (table_name, record_id, old_status, new_status, changed_by, detail)
  values (
    'stock_movements', old.id, old.status::text, 'deleted', auth.uid(),
    format('%s of %s %s (%s)%s', old.movement_type, old.quantity, v_sku,
           coalesce(nullif(old.reference_note, ''), 'no reference'),
           case when old.status <> 'pending' then format('; balance %s -> %s', v_before, v_after) else '' end)
  );

  return old;
end;
$$;

drop trigger if exists on_stock_movement_deleted on stock_movements;
create trigger on_stock_movement_deleted
  before delete on stock_movements
  for each row execute procedure public.reverse_stock_movement();

-- Supervisor can remove any movement. Staff can remove only their OWN entries, and only
-- before the supervisor has checked them (pending/logged); once a movement is verified or
-- under investigation it is the supervisor's call.
drop policy if exists "stock_movements_delete_supervisor" on stock_movements;
create policy "stock_movements_delete_supervisor" on stock_movements for delete to authenticated
  using (current_app_role() in ('warehouse_supervisor', 'system_admin'));

drop policy if exists "stock_movements_delete_own_unchecked" on stock_movements;
create policy "stock_movements_delete_own_unchecked" on stock_movements for delete to authenticated
  using (
    current_app_role() = 'warehouse_staff'
    and logged_by = auth.uid()
    and status in ('pending', 'logged')
  );
