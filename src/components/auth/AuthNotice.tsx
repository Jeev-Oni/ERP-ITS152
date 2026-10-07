import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function AuthNotice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const isError = tone === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm ${
        isError
          ? 'border-red-400/25 bg-red-400/10 text-red-200'
          : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
