# HopeAid Staff database setup (project-specific)

**Target only:** `ulikfxryicrsdpkpweve` — `https://ulikfxryicrsdpkpweve.supabase.co`.
Do **not** run these scripts in PluPrep, PluTalk, or PluBuy. No database passwords or secret/service-role keys belong in GitHub.

## Current status

The dedicated HopeAid project exists, but the ChatGPT Supabase connector is still authenticated to a different organization. No migration has been applied to HopeAid by ChatGPT yet.

## Install using the Supabase SQL Editor

1. Open [the HopeAid SQL Editor](https://supabase.com/dashboard/project/ulikfxryicrsdpkpweve/sql/new). Check the project reference in your address bar **before executing SQL**.
2. Open `supabase/schema.sql` from GitHub, copy its complete content, paste it into the SQL Editor, and choose **Run**. The schema creates exactly six public tables, role checks, role-restricted row-level-security (RLS) policies and the controlled attendance/task RPCs. The installation script is intended to run **once on a new project**.
3. Open `supabase/verify_installation.sql`, copy and run the SQL. Check for `PASS: six RLS tables...` and verify that the results show six tables with `rls_enabled = true` and `anon_can_read = false`.
4. Under **Authentication → Providers / Sign in**, disable public self-registration. Under **Authentication → URL Configuration**, set Site URL to `https://staff.hopeaid.ngo` and allow the same HTTPS origin as a redirect destination. Use approved email invitations.
5. Under **Authentication → Users**, invite `moses@hopeaid.ngo`. Ensure Moses controls that mailbox. The invitation must be redeemed and a unique password established. Do not use `password` or reuse an existing password.
6. After the Auth user exists, run `supabase/provision_moses_super_admin.sql` to assign the initial `super_admin` role. Confirm its verification query shows `is_active = true`.
7. Obtain the **publishable** browser API key from [API key settings](https://supabase.com/dashboard/project/ulikfxryicrsdpkpweve/settings/api-keys). Add only the `sb_publishable_` key to `config.js`. The URL is already staged there. Never use a `sb_secret_` or `service_role` key.
8. Deploy the latest GitHub commit through Cloudflare and test login on `https://staff.hopeaid.ngo` with the invited account. Then test supervisor vs staff authorization, attendance and task updates, and logout. For production, enable MFA policy, audit logging, backups, and scheduled access reviews.

## What is NOT done yet

- Supabase migration **has not been executed** on the HopeAid project.
- Auth user `moses@hopeaid.ngo` **has not been created or invited** by ChatGPT.
- The frontend publishable key is **not configured**, so live sign-in is not active.

To allow ChatGPT to finish directly, reconnect its Supabase plugin to the organization that owns `ulikfxryicrsdpkpweve`. Verify the plugin's project list contains the HopeAid project before applying migrations.
