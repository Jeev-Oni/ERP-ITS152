import { ArrowRight, Loader2 } from 'lucide-react';

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}
