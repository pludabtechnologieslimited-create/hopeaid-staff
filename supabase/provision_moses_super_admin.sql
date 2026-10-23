-- Hope Aid 247 Foundation: provision the initial Super Admin.
-- REQUIRED PREREQUISITES:
-- 1. Apply supabase/schema.sql in a NEW, dedicated HopeAid Supabase project.
-- 2. Invite/create and verify the authorised email moses@hopeaid.ngo in Supabase Authentication -> Users.
-- 3. Run this script manually, in that same project's SQL Editor, with administrator access.
--
-- This script DOES NOT create an Auth user, DOES NOT set a password,
-- and must not be exposed to the browser or executed in another app's database.
-- Use a unique password or secure invitation, not the shared word 'password'.

do $provision$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'moses@hopeaid.ngo'
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user moses@hopeaid.ngo does not exist. Invite the user first.';
  end if;

  insert into public.staff_profiles
    (id, email, full_name, job_title, department, role, is_active)
  values
    (v_user_id, 'moses@hopeaid.ngo', 'Moses', 'Super Administrator',
     'Administration', 'super_admin', true)
  on conflict (id) do update
    set role = 'super_admin', is_active = true;

  raise notice 'Super Admin profile provisioned for moses@hopeaid.ngo';
end
$provision$;

-- Verify the role and identity after provisioning:
select email, full_name, role, is_active
from public.staff_profiles
where lower(email) = 'moses@hopeaid.ngo';
