# HopeAid Staff — secure email-and-password accounts

**Project:** `ulikfxryicrsdpkpweve` — https://ulikfxryicrsdpkpweve.supabase.co

## Verified on 23 October 2026

- Six public staff tables and twelve row-level security policies are installed; RLS is enabled and anonymous table reading is blocked.
- The website uses Supabase email/password authentication with a public publishable key. No OTP is required by the website sign-in form.
- A server-side `create-staff` Edge Function (JWT-verified) is deployed to HopeAid's Supabase project. The function confirms the calling user's signed-in identity and their **active super_admin profile** server-side, creates staff accounts using Supabase Auth Admin API (`email_confirm: true`) and inserts the associated staff profile.
- The **Staff Directory → Create staff account** form has been committed in `app.js`. It asks for full name, email, role, department, job title and a unique initial password of at least 12 characters. It does not send invitation emails or email verification codes.
- The first Super Admin account **does not exist yet** in Supabase Auth and must be bootstrapped manually before this feature can be used. Live end-to-end login and staff creation remain **untested**.

## One-time bootstrap for Moses — no email code

1. Sign into the [HopeAid Supabase Authentication Users page](https://supabase.com/dashboard/project/ulikfxryicrsdpkpweve/auth/users) using the project owner account.
2. Select **Add user → Create new user** (not *Send invitation*).
3. Set the email to **`moses@hopeaid.ngo`** and create a unique temporary password of **at least 12 characters**. Select **Auto Confirm User / Confirm Email** if the Dashboard offers that option. Do not send the password through public chat or email.
4. Once the Auth user exists, run [`supabase/provision_moses_super_admin.sql`](./provision_moses_super_admin.sql) in the **HopeAid** SQL Editor (verify the project reference in the address bar), and confirm its final query shows `role = super_admin` and `is_active = true`.
5. In Supabase **Authentication → Providers → Email**, you may disable *Confirm Email* for a code-free flow. However, **still create admin-managed users with `email_confirm: true`**, because admin-created accounts can otherwise remain unconfirmed even if that toggle is disabled. Disable public self-registration in the appropriate Auth settings; user provisioning should be admin-only.
6. Log in as Moses at [staff.hopeaid.ngo](https://staff.hopeaid.ngo/), open **Staff Directory → Create staff account**, and create a test staff account. Check the new staff user can sign in using their email and temporary password **without an OTP**, and has only the permissions granted by their role.
7. Ask staff to change their initial password after first sign-in and share temporary credentials through a secure private channel. Password reset emails remain a separate, optional recovery feature. Verify the correct deployment has reached Cloudflare.

## Deployment and security

- Only `super_admin` can call `create-staff`; the server independently checks the caller's JWT, role and active status.
- The endpoint permits `staff`, `manager`, and `admin` roles, but **not** another `super_admin`.
- Supabase `SUPABASE_SERVICE_ROLE_KEY` stays exclusively in the Edge Function runtime; **never** copy the secret/service-role key into browser JavaScript, `config.js`, or GitHub.
- The Edge Function is tracked at `supabase/functions/create-staff/index.ts`.
- Confirm that published `app.js` matches the latest GitHub commit. Test failed login, inactive staff, manager inability to create accounts, RLS, attendance, tasks and logout before production use.
- Do not run any of these commands against PluPrep, PluTalk or PluBuy.
