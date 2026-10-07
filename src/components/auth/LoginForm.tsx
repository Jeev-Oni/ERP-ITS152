'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthField } from './AuthField';
import { PasswordToggle } from './PasswordToggle';
import { AuthNotice } from './AuthNotice';
import { SubmitButton } from './SubmitButton';

export function LoginForm({ notice }: { notice: { tone: 'error' | 'success'; text: string } | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setPending(false);
      // Supabase's wording is technical; the useful message is the same for every bad login.
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Secure staff access</p>
      <h1 className="text-4xl font-light tracking-tight text-foreground">Welcome back.</h1>
      <p className="mt-3 text-sm text-muted-foreground">Sign in to your JJPG Trading workspace.</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        {notice && !error && <AuthNotice tone={notice.tone}>{notice.text}</AuthNotice>}
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
        <AuthField
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline underline-offset-4">
            Forgot password?
          </Link>
        </div>

        <SubmitButton pending={pending}>{pending ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Need an account? Your IT administrator creates accounts, so ask them for access.
      </p>
    </div>
  );
}
