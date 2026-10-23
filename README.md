# HopeAid Staff Workspace

Internal staff dashboard for **Hope Aid 247 Foundation**.

Features: responsive dashboard, assigned tasks, programme tracking, reports, check-in/out, announcements, manager staff directory, role-based access, and an explicit sample-data preview.

## Deployment

This is a dependency-free static app suitable for Cloudflare Pages. Connect this GitHub repository, choose **no framework**, leave the build command blank, and use the repository root as the output directory.

## Configure secure staff access

1. Create a **dedicated HopeAid Supabase project** (do not use PluPrep, PluBuy or PluTalk's databases).
2. Run `supabase/schema.sql` in its SQL Editor.
3. Disable public sign-ups in Supabase Authentication settings, create approved staff accounts, then add staff records in `public.staff_profiles`. An administrator must explicitly assign manager or staff roles.
4. Edit `config.js` to set the project's URL and **publishable** key (never a secret or service-role key).
5. Test staff vs. manager access, attendance, task updates, reports, and logout on the deployed site before inviting real staff.

Until configured, use **Explore sample dashboard** for a local fictional preview. Demo changes are never saved or sent to a backend.

**Security:** data access is controlled by the SQL RLS policies, not just hidden buttons. General activity reports must not include personally identifying beneficiary information or safeguarding/GBV case details. This portal does not replace a dedicated confidential protection reporting channel. For production, add auditing, backups, MFA policy, and operational access reviews.

The HopeAid site's palette informed this design: deep blue and green. This is not part of the public HopeAid website.
