import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/shared/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { createClient } from '@/lib/supabase/server';

// Reached from the emailed link (via /auth/callback, which has already signed the person in
// with a short-lived recovery session) or by a signed-in user who wants to change their
// password. With no session at all, the link is missing, used up or expired.
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell>
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10">
            <AlertCircle className="h-5 w-5 text-red-300" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-foreground">This link has expired.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Reset links work once and expire after about an hour. Request a fresh one and try again.
          </p>
          <Link
            href="/forgot-password"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Request a new link
          </Link>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-muted hover:text-primary">Back to sign in</Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
