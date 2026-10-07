'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { PasswordToggle } from './PasswordToggle';
import { AuthNotice } from './AuthNotice';
import { SubmitButton } from './SubmitButton';

const MIN_LENGTH = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longEnough = password.length >= MIN_LENGTH;
  const matches = confirm.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!longEnough) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPending(false);
      setError(error.message);
      return;
    }
    // End the recovery session so the person signs in fresh with the new password.
    await supabase.auth.signOut();
    router.push('/login?reset=success');
    router.refresh();
  }

  const toggle = <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />;

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Account recovery</p>
      <h1 className="text-4xl font-light tracking-tight text-foreground">Choose a new password.</h1>
      <p className="mt-3 text-sm text-muted-foreground">You&apos;ll use it the next time you sign in.</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <AuthField
          id="password"
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          trailing={toggle}
        />
        <AuthField
          id="confirm"
          label="Confirm new password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <ul className="space-y-1 text-xs">
          <li className={longEnough ? 'text-emerald-300' : 'text-muted-foreground'}>
            {longEnough ? '✓' : '•'} At least {MIN_LENGTH} characters
          </li>
          <li className={matches ? 'text-emerald-300' : 'text-muted-foreground'}>
            {matches ? '✓' : '•'} Both entries match
          </li>
        </ul>

        <SubmitButton pending={pending}>{pending ? 'Saving…' : 'Update password'}</SubmitButton>
      </form>
    </div>
  );
}
