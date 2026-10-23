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
