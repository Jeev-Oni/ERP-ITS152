'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  CalendarCheck,
  Wallet,
  FileText,
  Package,
  Boxes,
  MapPin,
  Route,
  Car,
  Truck,
  Contact,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  {
    section: 'HR & Administration',
    links: [
      { href: '/hr/employees', label: 'Employees', icon: Contact },
      { href: '/hr/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/hr/payroll', label: 'Payroll', icon: Wallet },
      { href: '/hr/payslips', label: 'Payslips', icon: FileText },
    ],
  },
  {
    section: 'Warehouse Operations',
    links: [
      { href: '/warehouse/items', label: 'Item / SKU Master', icon: Package },
      { href: '/warehouse/stock-movements', label: 'Stock Movements', icon: Boxes },
      { href: '/warehouse/storage-locations', label: 'Storage Locations', icon: MapPin },
    ],
  },
  {
    section: 'Delivery & Logistics',
    links: [
      { href: '/logistics/dispatch', label: 'Dispatch', icon: Route },
      { href: '/logistics/trips', label: 'Trips', icon: Car },
      { href: '/logistics/trucks', label: 'Trucks', icon: Truck },
      { href: '/logistics/drivers', label: 'Drivers', icon: UserRound },
    ],
  },
];

// Every module page nests under one of these prefixes (e.g. /hr/payroll/[id] is still
// "in" Payroll), so active-state matches on prefix, not exact path.
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          active ? 'bg-primary/10 font-medium text-primary' : 'text-muted hover:bg-surface-hover/60 hover:text-foreground'
        )}
      >
        {active && <span aria-hidden className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary" />}
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
        {label}
      </Link>
    </li>
  );
}

const SECTION_LABEL = 'mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground';

export function SidebarNav({ isSystemAdmin }: { isSystemAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {/* Previously missing entirely — there was no way back to the dashboard home
          once you clicked into any module. This is that fix. */}
      <div className="mb-6">
        <ul className="space-y-0.5">
          <NavLink href="/" label="Dashboard Home" icon={Home} active={pathname === '/'} />
        </ul>
      </div>

      {NAV.map((group) => (
        <div key={group.section} className="mb-6">
          <p className={SECTION_LABEL}>{group.section}</p>
          <ul className="space-y-0.5">
            {group.links.map((link) => (
              <NavLink key={link.href} {...link} active={isActive(pathname, link.href)} />
            ))}
          </ul>
        </div>
      ))}

      {isSystemAdmin && (
        <div className="mb-6">
          <p className={SECTION_LABEL}>Admin</p>
          <ul className="space-y-0.5">
            <NavLink href="/admin/users" label="User Management" icon={Users} active={isActive(pathname, '/admin/users')} />
          </ul>
        </div>
      )}
    </>
  );
}
