-- seed.sql — demo data for local development (npx supabase db reset runs this automatically)

insert into items (sku, name, unit, current_balance) values
  ('CORN-001', 'Yellow Corn', 'kg', 5000),
  ('SOY-001', 'Soybean Meal', 'kg', 3000),
  ('WHT-001', 'Wheat Bran', 'kg', 2000);

insert into storage_locations (bin_code, zone, capacity) values
  ('A1-01', 'Zone A', 10000),
  ('A1-02', 'Zone A', 10000),
  ('B1-01', 'Zone B', 8000);

insert into trucks (plate_number, model, capacity_kg) values
  ('ABC-1234', 'Isuzu Elf', 5000),
  ('DEF-5678', 'Fuso Canter', 4000);

insert into employees (employee_code, full_name, position, daily_rate) values
  ('EMP-001', 'Juan Dela Cruz', 'Warehouse Staff', 550.00),
  ('EMP-002', 'Maria Santos', 'Driver', 600.00);

-- Note: profiles/drivers rows require real auth.users rows (created via Supabase Auth
-- sign-up or the dashboard), so they aren't seeded here — see docs/REPO_STRUCTURE.md.
