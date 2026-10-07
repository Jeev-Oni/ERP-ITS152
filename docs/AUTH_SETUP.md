# Sign-in, password reset and account management

## How a forgotten password works

1. `/login` has a **Forgot password?** link to `/forgot-password`.
2. The person enters their work email. Supabase emails a reset link. The page always says
   "if an account exists..." whether or not the address is registered, so nobody can use it to
   discover valid accounts.
3. The link goes to `/auth/callback`, which swaps the emailed code for a short-lived session and
   forwards to `/reset-password`.
4. They choose a new password (8+ characters), are signed out, and land on `/login` with a
   confirmation. A link that is used up or expired shows "This link has expired" with a button to
   request a new one.

Signed-in users can change their own password any time from **Password** in the top bar.

## One-time Supabase setup (the email link will not work without this)

In the Supabase dashboard:

1. **Authentication > URL Configuration**. Set **Site URL** to where the app runs, and add
   these under **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`
2. **Authentication > Providers > Email**. Turn **off** "Allow new users to sign up".
   Accounts are created by the IT administrator, and the `handle_new_user` trigger gives anyone who
   signs up an `admin_staff` profile, so open sign-up would let outsiders in.
3. **Authentication > SMTP Settings**. Supabase's built-in email sender is heavily rate-limited
   and meant for testing. For real use, connect a proper SMTP provider.
4. *(Optional, makes the link work when opened on a different device than the one that asked for
   it.)* **Authentication > Email Templates > Reset Password**, change the link to:

   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   ```

## IT administrator: accounts without email

Email can fail (rate limits, spam folders, no access to the inbox). The System Admin can always go to
**User Management > Account** on a person's row to:

- **Set a new password** for them directly. Tell them privately; they can change it again under
  **Password** in the top bar.
- **Change their sign-in email** (takes effect immediately).

Other account tasks on that page: create a user (name, email, temporary password, role,
department), edit name / role / department, and Activate / Deactivate.

**Deactivate** does two things: it flips `profiles.is_active` (migration 0011 makes every
permission check fail for inactive accounts) and bans the login in Supabase Auth so they can no
longer sign in or refresh their session. Activating reverses both. Nobody can deactivate or demote
themselves.

## Security notes

- Creating users, changing emails and setting passwords use the service-role key
  (`SUPABASE_SERVICE_ROLE_KEY`). It is read only in `src/lib/supabase/admin.ts`, which is marked
  `server-only`, and each action re-checks that the caller is an active System Admin.
- `/auth/callback` only redirects to same-site paths.
