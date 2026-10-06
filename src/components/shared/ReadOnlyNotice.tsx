import { roleLabel } from '@/lib/roles';

// Shown when a page is view-only for the signed-in role, so a missing Edit button is
// explained rather than mysterious. (RLS is still the real enforcement.)
export function ReadOnlyNotice({ role, who }: { role: string | null | undefined; who: string }) {
  return (
    <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
      You&apos;re signed in as <span className="font-medium text-foreground">{roleLabel(role)}</span>, so this page is
      view-only for you. {who} can add and edit here. A System Admin account can do everything, which is handy for testing.
    </p>
  );
}
