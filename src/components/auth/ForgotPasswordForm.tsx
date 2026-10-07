'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { AuthNotice } from './AuthNotice';
import { SubmitButton } from './SubmitButton';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const target = email.trim();
    const { error } = await createClient().auth.resetPasswordForEmail(target, {
      // /auth/callback swaps the emailed code for a session, then lands on /reset-password.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setPending(false);

    // Supabase says nothing about whether the address exists (so nobody can probe for valid
    // accounts); the only errors are things like rate limits, which are worth showing.
    if (error) {
      setError(
        error.status === 429 || /rate limit/i.test(error.message)
          ? 'Too many requests. Please wait a few minutes and try again, or ask your IT administrator to set a new password for you.'
          : error.message
      );
      return;
    }
    setSentTo(target);
  }

  if (sentTo) {
    return (
      <div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-accent">
          <MailCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-3xl font-light tracking-tight text-foreground">Check your email.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="text-foreground">{sentTo}</span>, we&apos;ve sent a link to reset
          the password. It expires in about an hour.
        </p>
        <div className="mt-6 rounded-md border border-border bg-surface/60 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Nothing arrived?</p>
          Check your spam folder, or ask your IT administrator. They can set a new password for you directly, with no
          email needed.
        </div>
        <div className="mt-8 flex items-center justify-between text-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-muted hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
          <button type="button" onClick={() => setSentTo(null)} className="text-primary hover:underline underline-offset-4">
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Account recovery</p>
      <h1 className="text-4xl font-light tracking-tight text-foreground">Forgot your password?</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Enter your work email and we&apos;ll send you a link to choose a new one.
      </p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <AuthField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@jjpgtrading.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <SubmitButton pending={pending}>{pending ? 'Sending…' : 'Send reset link'}</SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-muted hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
