// Renders any of the status enums from supabase/migrations/0001_extensions_and_enums.sql
// with a consistent color, so every module's state machine reads the same way in the UI.
// Uses low-opacity fills over the dark theme (light "100"-level Tailwind backgrounds
// read as washed-out paper against a near-black page, so these use transparent tints
// with a brighter foreground instead).
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-white/5 text-muted-foreground border border-border',
  pending: 'bg-white/5 text-muted-foreground border border-border',
  dispatched: 'bg-white/5 text-muted-foreground border border-border',
  closed: 'bg-white/10 text-muted border border-border',
  logged: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
  computed: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
  en_route: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
  pending_approval: 'bg-primary/10 text-primary border border-primary/30',
  matched: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  approved: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  verified: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  delivered: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  disbursed: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  discrepancy: 'bg-red-400/10 text-red-300 border border-red-400/20',
  delivery_failed: 'bg-red-400/10 text-red-300 border border-red-400/20',
  revision_needed: 'bg-red-400/10 text-red-300 border border-red-400/20',
  investigating: 'bg-primary/10 text-primary border border-primary/30',
  rescheduled: 'bg-primary/10 text-primary border border-primary/30',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? 'bg-white/5 text-muted-foreground border border-border'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
