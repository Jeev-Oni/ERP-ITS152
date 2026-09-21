-- 0005_storage_location.sql
-- Process 4: Storage Location (Figures 4.1-4.3)
-- Deliberately simple: the source doc notes this process has the fewest handoffs
-- of the four, so no status state machine is introduced here.

-- Storage Location Master
create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  bin_code text unique not null, -- e.g. 'A1-03'
  zone text,
  capacity numeric(12,2),
  created_at timestamptz not null default now()
);

-- "Assign New Storage Location/Bin" / "Retrieve Assigned Bin Location"
-- Current bin assignment per item. One active row per item; history kept via updated_at.
create table item_location_map (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  storage_location_id uuid not null references storage_locations (id),
  assigned_by uuid not null references profiles (id),
  assigned_at timestamptz not null default now(),
  unique (item_id)
);

-- "Supervisor Audits Location Accuracy (Periodic)"
create table location_audits (
  id uuid primary key default gen_random_uuid(),
  storage_location_id uuid not null references storage_locations (id),
  item_id uuid references items (id),
  is_accurate boolean not null,
  note text,
  audited_by uuid not null references profiles (id),
  audited_at timestamptz not null default now()
);

alter table storage_locations enable row level security;
alter table item_location_map enable row level security;
alter table location_audits enable row level security;
