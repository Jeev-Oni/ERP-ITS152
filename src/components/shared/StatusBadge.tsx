// Renders any of the status enums from supabase/migrations/0001_extensions_and_enums.sql
// with a consistent color, so every module's state machine reads the same way in the UI.
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-slate-100 text-slate-700',
  pending: 'bg-slate-100 text-slate-700',
  dispatched: 'bg-slate-100 text-slate-700',
  closed: 'bg-slate-200 text-slate-800',
  logged: 'bg-blue-100 text-blue-700',
  computed: 'bg-blue-100 text-blue-700',
  en_route: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  matched: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  disbursed: 'bg-emerald-100 text-emerald-700',
  discrepancy: 'bg-red-100 text-red-700',
  delivery_failed: 'bg-red-100 text-red-700',
  revision_needed: 'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-800',
  rescheduled: 'bg-amber-100 text-amber-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
