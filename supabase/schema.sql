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
 role text not null default 'staff' check(role in ('staff','manager','admin')),
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
 where p.id=(select auth.uid()) and p.is_active and p.role in ('manager','admin'));
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

revoke all on public.staff_profiles,public.programmes,public.tasks,public.attendance,public.reports,public.announcements from anon;
grant select on public.staff_profiles,public.programmes,public.tasks,public.attendance,public.reports,public.announcements to authenticated;
grant insert on public.programmes,public.tasks,public.reports,public.announcements to authenticated;
grant update on public.programmes,public.tasks to authenticated;

-- BOOTSTRAP: Once the administrator has invited an Auth user,
-- insert the corresponding staff record from SQL Editor (never the browser).
-- Substitute values:
-- insert into public.staff_profiles(id,email,full_name,job_title,department,role)
-- values ('AUTH_USER_UUID','staff@hopeaid.ngo','Full Name','Manager','Programmes','manager');
