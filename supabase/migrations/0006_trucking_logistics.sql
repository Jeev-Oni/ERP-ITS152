-- 0006_trucking_logistics.sql
-- Process 3: Trucking Logistics (Figures 3.1-3.3)

-- Delivery-Asset (Truck) Master
create table trucks (
  id uuid primary key default gen_random_uuid(),
  plate_number text unique not null,
  model text,
  capacity_kg numeric(10,2),
  last_maintenance_date date,
  next_maintenance_due date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id), -- links to their login, if they have one
  full_name text not null,
  license_number text,
  is_active boolean not null default true
);

-- "Plan Route & Assign Truck/Driver" onward — carries the state machine.
-- rescheduled_from_trip_id: a rescheduled trip is a NEW row, per the source doc
-- ("Trip Rescheduled (new trip instance)"), never a mutation of the failed trip.
create table trips (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks (id),
  driver_id uuid not null references drivers (id),
  client_name text not null,
  destination_address text not null,
  status trip_status not null default 'dispatched',
  rescheduled_from_trip_id uuid references trips (id),
  dispatched_by uuid not null references profiles (id),
  dispatched_at timestamptz not null default now(),
  departed_at timestamptz,
  arrived_at timestamptz,
  closed_at timestamptz
);

-- "Generate Digital Trip Ticket"
create table trip_tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  storage_path text,
  generated_at timestamptz not null default now()
);

-- "Capture Delivery Confirmation" — signature/photo, standing in for the
-- "Signed Confirmation" flowing back from the Client/Recipient lane in the BPMN diagram.
create table delivery_confirmations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  confirmed boolean not null,
  issue_note text, -- populated when confirmed = false ("Report Issue")
  storage_path text, -- signature/photo in Supabase Storage
  confirmed_at timestamptz not null default now()
);

-- "Truck Due for Maintenance?" gateway → "Schedule Fleet Maintenance"
create table maintenance_schedule (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks (id),
  trip_id uuid references trips (id), -- the trip that triggered the maintenance check
  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  scheduled_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

alter table trucks enable row level security;
alter table drivers enable row level security;
alter table trips enable row level security;
alter table trip_tickets enable row level security;
alter table delivery_confirmations enable row level security;
alter table maintenance_schedule enable row level security;
