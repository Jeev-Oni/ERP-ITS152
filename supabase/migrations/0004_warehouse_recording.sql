-- 0004_warehouse_recording.sql
-- Process 2: Warehouse Recording (Figures 2.1-2.3)

-- Item/SKU Master
create table items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  unit text not null, -- e.g. 'kg', 'sack'
  current_balance numeric(12,2) not null default 0,
  reorder_point numeric(12,2),
  created_at timestamptz not null default now()
);

-- "Receive Raw Materials from Supplier" / "Pick Item for Outbound Order"
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id),
  movement_type stock_movement_type not null,
  quantity numeric(12,2) not null check (quantity > 0),
  reference_note text, -- supplier name or outbound order number
  status stock_movement_status not null default 'pending',
  logged_by uuid not null references profiles (id),
  logged_at timestamptz not null default now()
);

-- "Log Movement in Digital Stock Ledger" (append-only balance history)
create table stock_ledger (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id),
  stock_movement_id uuid not null references stock_movements (id) on delete cascade,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- "Investigate & Correct Discrepancy"
create table stock_discrepancies (
  id uuid primary key default gen_random_uuid(),
  stock_movement_id uuid not null references stock_movements (id) on delete cascade,
  physical_count numeric(12,2) not null,
  system_count numeric(12,2) not null,
  resolution_note text,
  resolved_by uuid references profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table items enable row level security;
alter table stock_movements enable row level security;
alter table stock_ledger enable row level security;
alter table stock_discrepancies enable row level security;

-- "Update Balance on Item/SKU Master" — the BPMN diagram draws this as a System task,
-- deliberately separate from the human tasks either side of it. Implemented here as a
-- trigger so the balance can never drift out of sync with a logged movement.
create function public.apply_stock_movement()
returns trigger as $$
declare
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if new.status = 'logged' and old.status = 'pending' then
    select current_balance into v_balance_before from items where id = new.item_id;

    if new.movement_type = 'receipt' then
      v_balance_after := v_balance_before + new.quantity;
    else
      v_balance_after := v_balance_before - new.quantity;
    end if;

    update items set current_balance = v_balance_after where id = new.item_id;

    insert into stock_ledger (item_id, stock_movement_id, balance_before, balance_after)
    values (new.item_id, new.id, v_balance_before, v_balance_after);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_stock_movement_logged
  after update on stock_movements
  for each row execute procedure public.apply_stock_movement();
