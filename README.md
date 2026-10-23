# HopeAid Staff Workspace

Internal staff dashboard for **Hope Aid 247 Foundation**.

Features: responsive dashboard, assigned tasks, programme tracking, reports, check-in/out, announcements, manager staff directory, role-based access, and an explicit sample-data preview.

## Deployment

This is a dependency-free static app suitable for Cloudflare Pages. Connect this GitHub repository, choose **no framework**, leave the build command blank, and use the repository root as the output directory.

## Configure secure staff access

**HopeAid production project:** `ulikfxryicrsdpkpweve`. For the simplest one-time installation, open [the HopeAid SQL Editor](https://supabase.com/dashboard/project/ulikfxryicrsdpkpweve/sql/new), then paste and run [`supabase/INSTALL_ONCE.sql`](supabase/INSTALL_ONCE.sql). It contains both the schema and its security validation in one transaction. See [`supabase/SETUP.md`](supabase/SETUP.md) for all remaining Auth and deployment steps.

1. Create a **dedicated HopeAid Supabase project** (do not use PluPrep, PluBuy or PluTalk's databases).
2. Run `supabase/schema.sql` in its SQL Editor.
3. Disable public sign-ups in Supabase Authentication settings, create approved staff accounts, then add staff records in `public.staff_profiles`. An authorised database administrator must explicitly assign staff, manager, admin or super_admin roles. Never derive roles from editable user metadata.
4. `config.js` now contains the HopeAid project URL and **publishable** key (never use a secret or service-role key).
5. Test staff vs. manager access, attendance, task updates, reports, and logout on the deployed site before inviting real staff.

Until configured, use **Explore sample dashboard** for a local fictional preview. Demo changes are never saved or sent to a backend.

**Security:** data access is controlled by the SQL RLS policies, not just hidden buttons. General activity reports must not include personally identifying beneficiary information or safeguarding/GBV case details. This portal does not replace a dedicated confidential protection reporting channel. For production, add auditing, backups, MFA policy, and operational access reviews.

The HopeAid site's palette informed this design: deep blue and green. This is not part of the public HopeAid website.

## Initial HopeAid super administrator

- Approved email: `moses@hopeaid.ngo`
- Role: `super_admin` (highest portal role; inherits all management access)
- **Not yet provisioned.** The dedicated HopeAid Supabase project and six-table schema are installed. Create the Auth user in Supabase Authentication → Users and then run the provisioning script.
- Run `supabase/provision_moses_super_admin.sql` from that project's SQL Editor to grant the role. This requires an existing matching Auth user. The SQL is not executed by GitHub deployment.
- Use an invitation/unique temporary password and require prompt password reset. Do **not** use `password` as a default password or put credentials in source control.

**Email delivery:** Supabase's default SMTP service only supports pre-authorized addresses. To send email invitations/password resets to staff, configure custom SMTP. Until then, securely create approved users with a strong temporary password in the Auth dashboard. The website supports invited-user password setup and password recovery when email delivery is configured.
