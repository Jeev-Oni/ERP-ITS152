import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasRole } from '@/lib/roles';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';
import { CreateTruckForm } from '@/components/logistics/CreateTruckForm';
import { ScheduleMaintenanceForm } from '@/components/logistics/ScheduleMaintenanceForm';
import { MaintenanceList } from '@/components/logistics/MaintenanceList';
import { TruckRow } from '@/components/logistics/TruckRow';

// Delivery-Asset (Truck) Master, plus the maintenance side of Trucking Logistics.
export default async function TrucksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const canEdit = hasRole(profile?.role, ['fleet_supervisor']);

  const { data: trucks } = await supabase.from('trucks').select('*').order('plate_number');

  // maintenance_schedule RLS restricts reads to fleet_supervisor/system_admin, so this
  // query simply returns empty for anyone else.
  const { data: maintenanceJobs } = await supabase
    .from('maintenance_schedule')
    .select('*, trucks(plate_number)')
    .order('scheduled_date', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Delivery & Logistics" title="Trucks" description="The fleet, its maintenance dates, and scheduled service jobs." />
      {!canEdit && <ReadOnlyNotice role={profile?.role} who="Fleet Supervisor" />}

      {canEdit && <CreateTruckForm />}

      <div className="table-wrap">
<table className="data-table">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Plate</th>
            <th>Model</th>
            <th>Capacity (kg)</th>
            <th>Last Maintenance</th>
            <th>Next Due</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(trucks ?? []).map((t: any) => (
            <TruckRow key={t.id} truck={t} canEdit={canEdit} />
          ))}
          {(trucks ?? []).length === 0 && (
            <tr><td colSpan={7} className="py-4 text-muted-foreground">No trucks yet.</td></tr>
          )}
        </tbody>
      </table>
</div>

      {canEdit && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Maintenance</p>
          <ScheduleMaintenanceForm trucks={(trucks as any) ?? []} />
          <MaintenanceList jobs={(maintenanceJobs as any) ?? []} />
        </div>
      )}
    </div>
  );
}
