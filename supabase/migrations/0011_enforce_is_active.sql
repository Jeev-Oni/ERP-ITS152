-- 0011_enforce_is_active.sql
-- profiles.is_active existed and the User Management "Deactivate" button flipped it, but
-- nothing ever read it: a deactivated user kept signing in and kept every permission.
--
-- Every RLS policy decides access through current_app_role(), so making it return NULL for
-- an inactive profile revokes ALL data access in one place (NULL matches no role list).
-- The user can still read their OWN profile row (profiles_self_read), which is how the app
-- notices the account is inactive and signs them out with an explanation.
create or replace function public.current_app_role()
returns app_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and is_active;
$$;

-- The admin policies on profiles (0002) asked "is the caller a system_admin?" by SELECTing
-- from profiles inside a policy ON profiles, which Postgres rejects with "infinite recursion
-- detected in policy for relation profiles" the moment any signed-in user reads the table.
-- current_app_role() is security definer (it bypasses RLS), so asking it instead is safe.
-- Dropped and re-created under the same names, so this is a no-op if you already fixed it.
drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all" on profiles for select to authenticated
  using (current_app_role() = 'system_admin');

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles for all to authenticated
  using (current_app_role() = 'system_admin')
  with check (current_app_role() = 'system_admin');
