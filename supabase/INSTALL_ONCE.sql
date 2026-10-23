-- HOPE AID 247 — ONE-TIME DATABASE INSTALL (TRANSACTIONAL)
-- Target: https://supabase.com/dashboard/project/ulikfxryicrsdpkpweve/sql/new
-- Run ONLY in HopeAid project ref ulikfxryicrsdpkpweve.
-- Do not rerun after successful installation.
-- No passwords, service-role keys, or auth user creation are included.
-- The transaction COMMIT happens only after the verification succeeds.

BEGIN;

-- =============== DATABASE SCHEMA ===============

-- HOPE AID 247 FOUNDATION STAFF WORKSPACE
-- Run only in a NEW dedicated HopeAid Supabase project (SQL Editor).
-- Create auth users by invitation, and disable public account self-registration.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.staff_profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null,
 job_title text,
 department text,
 role text not null default 'staff' check(role in ('staff','manager','admin','super_admin')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.programmes(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 3 and 200),
 description text not null default '',
 sector text not null default 'General',
 location text not null default '',
 status text not null default 'planning' check(status in ('planning','active','on_hold','completed')),
 start_date date,
 end_date date,
 created_at timestamptz not null default now()
);
create table public.tasks(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 200),
 description text not null default '',
 assigned_to uuid not null references public.staff_profiles(id),
 created_by uuid not null default auth.uid() references public.staff_profiles(id),
 programme_id uuid references public.programmes(id) on delete set null,
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 status text not null default 'todo' check(status in ('todo','in_progress','done')),
 due_date date,
 created_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks(assigned_to,status,due_date);
create table public.attendance(
 id uuid primary key default gen_random_uuid(),
 staff_id uuid not null references public.staff_profiles(id),
 work_date date not null,
 clock_in timestamptz not null,
 clock_out timestamptz,
 created_at timestamptz not null default now(),
 unique(staff_id,work_date),
 check(clock_out is null or clock_out >= clock_in)
);
create index attendance_staff_idx on public.attendance(staff_id,work_date desc);
create table public.reports(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 200),
 summary text not null check(length(trim(summary)) >= 3),
 challenges text not null default '',
 next_steps text not null default '',
 programme_id uuid references public.programmes(id) on delete set null,
 author_id uuid not null default auth.uid() references public.staff_profiles(id),
 created_at timestamptz not null default now()
);
create index reports_author_idx on public.reports(author_id,created_at desc);
create table public.announcements(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 200),
 body text not null check(length(trim(body)) >= 3),
 author_id uuid not null default auth.uid() references public.staff_profiles(id),
 created_at timestamptz not null default now()
);

create function private.is_active_staff() returns boolean
language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.staff_profiles p
 where p.id=(select auth.uid()) and p.is_active);
$$;
create function private.is_manager() returns boolean
language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.staff_profiles p
 where p.id=(select auth.uid()) and p.is_active and p.role in ('manager','admin','super_admin'));
$$;
revoke all on function private.is_active_staff() from public;
revoke all on function private.is_manager() from public;
grant execute on function private.is_active_staff(), private.is_manager() to authenticated;

alter table public.staff_profiles enable row level security;
alter table public.programmes enable row level security;
alter table public.tasks enable row level security;
alter table public.attendance enable row level security;
alter table public.reports enable row level security;
alter table public.announcements enable row level security;

create policy "profile: own or manager" on public.staff_profiles
for select to authenticated using(
 (select private.is_active_staff()) and
 (id=(select auth.uid()) or (select private.is_manager()))
);
-- No profile inserts/updates/deletes are allowed from public browser clients.

create policy "programmes: staff view" on public.programmes
for select to authenticated using((select private.is_active_staff()));
create policy "programmes: manager insert" on public.programmes
for insert to authenticated with check((select private.is_manager()));
create policy "programmes: manager update" on public.programmes
for update to authenticated using((select private.is_manager()))
with check((select private.is_manager()));

create policy "tasks: own or manager view" on public.tasks
for select to authenticated using(
 (select private.is_active_staff()) and
 (assigned_to=(select auth.uid()) or (select private.is_manager()))
);
create policy "tasks: manager insert" on public.tasks
for insert to authenticated with check(
 (select private.is_manager()) and created_by=(select auth.uid())
 and exists(select 1 from public.staff_profiles p
            where p.id=assigned_to and p.is_active)
);
create policy "tasks: manager update" on public.tasks
for update to authenticated using((select private.is_manager()))
with check((select private.is_manager()));
-- Staff task statuses are updated through a controlled RPC below.

create policy "attendance: own or manager view" on public.attendance
for select to authenticated using(
 (select private.is_active_staff()) and
 (staff_id=(select auth.uid()) or (select private.is_manager()))
);
-- Attendance inserts/updates via public clients are NOT permitted.

create policy "reports: own or manager view" on public.reports
for select to authenticated using(
 (select private.is_active_staff()) and
 (author_id=(select auth.uid()) or (select private.is_manager()))
);
create policy "reports: staff insert own" on public.reports
for insert to authenticated with check(
 (select private.is_active_staff()) and author_id=(select auth.uid())
);

create policy "announcements: staff view" on public.announcements
for select to authenticated using((select private.is_active_staff()));
create policy "announcements: manager insert" on public.announcements
for insert to authenticated with check(
 (select private.is_manager()) and author_id=(select auth.uid())
);

-- Privileged operations below require an authenticated active staff account.
-- Explicitly revoke PUBLIC execution of SECURITY DEFINER RPCs.
create function public.set_task_status(p_task_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not private.is_active_staff() then
   raise exception 'Staff account required';
 end if;
 if p_status not in ('todo','in_progress','done') then
   raise exception 'Invalid task status';
 end if;
 update public.tasks set status=p_status
 where id=p_task_id and (assigned_to=(select auth.uid()) or private.is_manager());
 if not found then raise exception 'Task not found or access denied'; end if;
end;
$$;
create function public.clock_in()
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not private.is_active_staff() then
   raise exception 'Staff account required';
 end if;
 insert into public.attendance(staff_id,work_date,clock_in)
 values ((select auth.uid()),(now() at time zone 'Africa/Lagos')::date,now());
exception when unique_violation then
 raise exception 'Already checked in today';
end;
$$;
create function public.clock_out()
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not private.is_active_staff() then
   raise exception 'Staff account required';
 end if;
 update public.attendance set clock_out=now()
 where staff_id=(select auth.uid())
   and work_date=(now() at time zone 'Africa/Lagos')::date
   and clock_out is null;
 if not found then raise exception 'No active check-in for today'; end if;
end;
$$;
revoke all on function public.set_task_status(uuid,text) from public,anon;
revoke all on function public.clock_in() from public,anon;
revoke all on function public.clock_out() from public,anon;
grant execute on function public.set_task_status(uuid,text),public.clock_in(),public.clock_out() to authenticated;

-- Supabase may have default authenticated table grants. Reset both roles first.
-- RLS restricts rows; explicit SQL grants restrict operations.
revoke all on public.staff_profiles,public.programmes,public.tasks,public.attendance,public.reports,public.announcements from anon,authenticated;
grant select on public.staff_profiles,public.programmes,public.tasks,public.attendance,public.reports,public.announcements to authenticated;
grant insert on public.programmes,public.tasks,public.reports,public.announcements to authenticated;
grant update on public.programmes,public.tasks to authenticated;

-- BOOTSTRAP: Once the administrator has invited an Auth user,
-- insert the corresponding staff record from SQL Editor (never the browser).
-- Substitute values:
-- Create approved Auth users first (Authentication -> Users), then provision profile roles from SQL Editor.
-- The initial super admin account is moses@hopeaid.ngo: use the separate
-- supabase/provision_moses_super_admin.sql after its Auth user exists.
-- Do NOT create a shared/default password, and do NOT grant super_admin from client metadata.

-- =============== SECURITY VERIFICATION ===============

-- Hope Aid 247 Foundation — post-install verification
-- READ ONLY. Run in the SQL Editor for project: ulikfxryicrsdpkpweve
-- Run after supabase/schema.sql, before inviting staff.
-- Expected: Successful execution with no EXCEPTION, 6 rows of RLS = true,
-- 12 or more role-scoped RLS policies, no anon table privileges.

do $verify$
declare
  table_name text;
  table_ref text;
  policy_count integer;
begin
  foreach table_name in array array[
    'staff_profiles','programmes','tasks','attendance','reports','announcements'
  ]
  loop
    table_ref := format('public.%I',table_name);

    if to_regclass(table_ref) is null then
      raise exception 'Missing required HopeAid table: %', table_ref;
    end if;

    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=table_name
        and c.relkind in ('r','p') and c.relrowsecurity
    ) then
      raise exception 'RLS must be enabled on %',table_ref;
    end if;

    if has_table_privilege('anon',table_ref,'SELECT') or
       has_table_privilege('anon',table_ref,'INSERT') or
       has_table_privilege('anon',table_ref,'UPDATE') or
       has_table_privilege('anon',table_ref,'DELETE') then
      raise exception 'Anonymous access detected on %',table_ref;
    end if;

    if not has_table_privilege('authenticated',table_ref,'SELECT') then
      raise exception 'Authenticated SELECT grant is missing for %',table_ref;
    end if;
  end loop;

  if has_table_privilege('authenticated','public.staff_profiles','INSERT') or
     has_table_privilege('authenticated','public.staff_profiles','UPDATE') or
     has_table_privilege('authenticated','public.staff_profiles','DELETE') then
    raise exception 'Staff profile modifications must be admin-only, not browser-writable';
  end if;

  if has_table_privilege('authenticated','public.attendance','INSERT') or
     has_table_privilege('authenticated','public.attendance','UPDATE') or
     has_table_privilege('authenticated','public.attendance','DELETE') then
    raise exception 'Attendance must be written only by controlled RPCs';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname='public'
    and tablename in (
      'staff_profiles','programmes','tasks','attendance','reports','announcements'
    );
  if policy_count < 12 then
    raise exception 'Expected 12 or more HopeAid RLS policies; found %',policy_count;
  end if;

  if to_regprocedure('public.set_task_status(uuid,text)') is null or
     to_regprocedure('public.clock_in()') is null or
     to_regprocedure('public.clock_out()') is null then
    raise exception 'A required secured RPC is missing';
  end if;

  if has_function_privilege('anon','public.set_task_status(uuid,text)','EXECUTE') or
     has_function_privilege('anon','public.clock_in()','EXECUTE') or
     has_function_privilege('anon','public.clock_out()','EXECUTE') then
    raise exception 'Anonymous users must not execute privileged HopeAid RPCs';
  end if;

  if not has_function_privilege('authenticated','public.clock_in()','EXECUTE') or
     not has_function_privilege('authenticated','public.clock_out()','EXECUTE') or
     not has_function_privilege('authenticated','public.set_task_status(uuid,text)','EXECUTE') then
    raise exception 'Authenticated RPC grants are incomplete';
  end if;

  if position('super_admin' in pg_get_functiondef('private.is_manager()'::regprocedure))=0 then
    raise exception 'Super Admin role is not included in privileged access checks';
  end if;

  raise notice 'PASS: six RLS tables, secured RPCs, Super Admin role and grants verified.';
end
$verify$;

-- Review the table-by-table policies in the SQL Editor results:
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       count(p.policyname) as policies,
       has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'SELECT') as anon_can_read
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
left join pg_policies p on p.schemaname=n.nspname and p.tablename=c.relname
where n.nspname='public'
  and c.relname in ('staff_profiles','programmes','tasks','attendance','reports','announcements')
group by c.relname,c.relrowsecurity,n.nspname
order by c.relname;

COMMIT;
