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
5. Under **Authentication → Users**, create an authorised user with email `moses@hopeaid.ngo` and a unique strong temporary password of at least 12 characters, shared privately with Moses. Alternatively, configure custom SMTP first and send an invitation, then let Moses establish a new password using the staff portal invitation screen. Supabase's default SMTP service only sends to pre-authorised project-team addresses, so inviting external staff by email without custom SMTP may fail. Do **not** give Moses project/organization admin permissions merely to get email delivery. Never use the literal default password `password`.
6. After the Auth user exists, run `supabase/provision_moses_super_admin.sql` to assign the initial `super_admin` role. Confirm its verification query shows `is_active = true`.
7. The **publishable** browser API key and project URL have already been configured in `config.js`. Never replace the publishable key with a `sb_secret_` or `service_role` key. Deploy the latest commit through Cloudflare so live login can reach Supabase.
8. Deploy the latest GitHub commit through Cloudflare and test login on `https://staff.hopeaid.ngo` with the invited account. Then test supervisor vs staff authorization, attendance and task updates, and logout. For production, enable MFA policy, audit logging, backups, and scheduled access reviews.

## What is NOT done yet

- Supabase migration **has not been executed** on the HopeAid project.
- Auth user `moses@hopeaid.ngo` **has not been created or invited** by ChatGPT.
- The frontend publishable key is **configured** in GitHub, but real staff login has not yet been tested with a registered staff account.

To allow ChatGPT to finish directly, reconnect its Supabase plugin to the organization that owns `ulikfxryicrsdpkpweve`. Verify the plugin's project list contains the HopeAid project before applying migrations.
