-- 0002_profiles_and_auth.sql
-- Extends auth.users with the role/department every RLS policy in this project checks.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role app_role not null,
  department department not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_self_read"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_admin_read_all"
  on profiles for select
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'system_admin')
  );

create policy "profiles_admin_write"
  on profiles for all
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'system_admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'system_admin')
  );

-- Auto-create a profile row whenever a new auth user signs up.
-- New users default to 'admin_staff' / 'hr_administration' — a system_admin should
-- reassign the real role immediately after invite. Adjust the defaults to taste.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'admin_staff',
    'hr_administration'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used throughout the RLS migration: current user's role, in one place.
create function public.current_role()
returns app_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;
