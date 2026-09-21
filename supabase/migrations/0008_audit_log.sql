-- 0008_audit_log.sql
-- The document repeatedly names duplicate paperwork and lost visibility as the root
-- problem. This generic audit trail is the digital equivalent of "Supervisor Verifies &
-- Closes Audit Trail," generalized to every status-bearing table across all four processes.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  old_status text,
  new_status text,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log_read_all_authenticated" on audit_log for select to authenticated
  using (true); -- everyone can read the trail; nobody can write to it directly

create function public.log_status_change()
returns trigger as $$
begin
  if (to_jsonb(new) ? 'status') and (old.status is distinct from new.status) then
    insert into audit_log (table_name, record_id, old_status, new_status, changed_by)
    values (TG_TABLE_NAME, new.id, old.status::text, new.status::text, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger audit_payroll_cutoffs after update on payroll_cutoffs
  for each row execute procedure public.log_status_change();
create trigger audit_stock_movements after update on stock_movements
  for each row execute procedure public.log_status_change();
create trigger audit_trips after update on trips
  for each row execute procedure public.log_status_change();
