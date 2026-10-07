import { AuthShell } from '@/components/shared/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

// Messages the app redirects here with (?reset=success after a password change,
// ?error=... when an emailed link or an account is no longer valid).
const NOTICES: Record<string, { tone: 'error' | 'success'; text: string }> = {
  'reset=success': { tone: 'success', text: 'Your password was updated. Sign in with your new password.' },
  'error=link-expired': {
    tone: 'error',
    text: 'That reset link is invalid or has expired. Request a new one below.',
  },
  'error=deactivated': {
    tone: 'error',
    text: 'This account has been deactivated. Contact your IT administrator if you think that is a mistake.',
  },
};

export default function LoginPage({ searchParams }: { searchParams: { reset?: string; error?: string } }) {
  const key = searchParams.reset ? `reset=${searchParams.reset}` : searchParams.error ? `error=${searchParams.error}` : '';
  return (
    <AuthShell>
      <LoginForm notice={NOTICES[key] ?? null} />
    </AuthShell>
  );
}
