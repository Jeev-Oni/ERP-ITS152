import { Boxes, MapPin, Radio, Truck, Wallet } from 'lucide-react';

const MODULES = [
  { icon: Wallet, label: 'Salary Distribution' },
  { icon: Boxes, label: 'Warehouse Recording' },
  { icon: Truck, label: 'Trucking Logistics' },
  { icon: MapPin, label: 'Storage Location' },
];

// Split-screen frame shared by sign-in, forgot-password and reset-password: the form on the
// left, a calm brand panel on the right (hidden on small screens).
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-primary/40 bg-accent">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">JJPG Trading</span>
        </div>

        <div className="my-auto w-full max-w-[440px] py-12">{children}</div>

        <p className="text-[11px] text-muted-foreground">
          JJPG Trading ERP &middot; Phase 1 &middot; Authorized staff only
        </p>
      </section>

      <aside className="relative hidden overflow-hidden border-l border-border lg:flex lg:flex-col lg:justify-end lg:p-16">
        {/* Ambient glow + concentric rings */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(900px 600px at 85% 8%, hsl(41 47% 56% / 0.10), transparent 60%), radial-gradient(700px 600px at 0% 100%, hsl(165 30% 42% / 0.08), transparent 60%)',
          }}
        />
        <div aria-hidden className="absolute -right-40 top-6 h-[640px] w-[640px] rounded-full border border-primary/10" />
        <div aria-hidden className="absolute -right-16 top-32 h-[400px] w-[400px] rounded-full border border-primary/10" />
        <div aria-hidden className="absolute right-12 top-56 h-[160px] w-[160px] rounded-full border border-primary/15" />

        <div className="relative max-w-xl">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/70">
            Operations Center
          </p>
          <h2 className="text-5xl font-light leading-[1.08] tracking-tight text-foreground xl:text-6xl">
            One record.
            <br />
            <span className="text-primary">Every department.</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            A shared, real-time system for payroll, warehouse stock, trucking and storage, so every team works from
            the same numbers.
          </p>

          <ul className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {MODULES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/50 px-3 py-2.5 text-xs text-foreground/90 backdrop-blur"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
