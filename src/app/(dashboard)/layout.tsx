import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const NAV = [
  { section: 'HR & Administration', links: [
    { href: '/hr/attendance', label: 'Attendance' },
    { href: '/hr/payroll', label: 'Payroll' },
    { href: '/hr/payslips', label: 'Payslips' },
  ]},
  { section: 'Warehouse Operations', links: [
    { href: '/warehouse/items', label: 'Item / SKU Master' },
    { href: '/warehouse/stock-movements', label: 'Stock Movements' },
    { href: '/warehouse/storage-locations', label: 'Storage Locations' },
  ]},
  { section: 'Delivery & Logistics', links: [
    { href: '/logistics/dispatch', label: 'Dispatch' },
    { href: '/logistics/trips', label: 'Trips' },
    { href: '/logistics/trucks', label: 'Trucks' },
  ]},
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/40 p-4">
        <div className="mb-6">
          <p className="font-semibold">JJPG Trading</p>
          <p className="text-xs text-muted-foreground">{profile?.full_name} · {profile?.role}</p>
        </div>
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{group.section}</p>
            <ul className="space-y-1">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block rounded px-2 py-1 text-sm hover:bg-muted">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
