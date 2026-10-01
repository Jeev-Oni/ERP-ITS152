import { createClient } from '@/lib/supabase/server';
import { RoleGate } from '@/components/shared/RoleGate';
import { CreateTruckForm } from '@/components/logistics/CreateTruckForm';
import { ScheduleMaintenanceForm } from '@/components/logistics/ScheduleMaintenanceForm';
import { MaintenanceList } from '@/components/logistics/MaintenanceList';

// Delivery-Asset (Truck) Master, plus the maintenance side of Trucking Logistics.
export default async function TrucksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: trucks } = await supabase.from('trucks').select('*').order('plate_number');

  // maintenance_schedule RLS restricts reads to fleet_supervisor/system_admin, so this
  // query simply returns empty for anyone else — the RoleGate below is a UI-level mirror
  // of that same restriction, not the actual enforcement.
  const { data: maintenanceJobs } = await supabase
    .from('maintenance_schedule')
    .select('*, trucks(plate_number)')
    .order('scheduled_date', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Trucks</h1>

      <RoleGate currentRole={role as any} allow={['fleet_supervisor']}>
        <CreateTruckForm />
      </RoleGate>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Plate</th>
            <th>Model</th>
            <th>Capacity (kg)</th>
            <th>Last Maintenance</th>
            <th>Next Due</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {(trucks ?? []).map((t: any) => (
            <tr key={t.id} className="border-b border-border">
              <td className="py-2">{t.plate_number}</td>
              <td>{t.model ?? '—'}</td>
              <td>{t.capacity_kg ?? '—'}</td>
              <td className="text-muted-foreground">{t.last_maintenance_date ?? '—'}</td>
              <td className="text-muted-foreground">{t.next_maintenance_due ?? '—'}</td>
              <td>{t.is_active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {(trucks ?? []).length === 0 && (
            <tr><td colSpan={6} className="py-4 text-muted-foreground">No trucks yet.</td></tr>
          )}
        </tbody>
      </table>

      <RoleGate currentRole={role as any} allow={['fleet_supervisor']}>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Maintenance</p>
          <ScheduleMaintenanceForm trucks={(trucks as any) ?? []} />
          <MaintenanceList jobs={(maintenanceJobs as any) ?? []} />
        </div>
      </RoleGate>
    </div>
  );
}
