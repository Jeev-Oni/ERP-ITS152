import { createClient } from '@/lib/supabase/server';
import { RoleGate } from '@/components/shared/RoleGate';
import { CreateTripForm } from '@/components/logistics/CreateTripForm';
import { DispatchTripsList } from '@/components/logistics/DispatchTripsList';

// Trip planning and the "Report Issue & Reschedule Trip" loop — Dispatcher's home base.
export default async function DispatchPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const role = (profile?.role ?? '') as string;

  const { data: trucks } = await supabase.from('trucks').select('id, plate_number').eq('is_active', true).order('plate_number');
  const { data: drivers } = await supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name');
  const { data: trips } = await supabase
    .from('trips')
    .select('id, client_name, destination_address, status, trucks(plate_number), drivers(full_name)')
    .order('dispatched_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Dispatch</h1>

      <RoleGate currentRole={role as any} allow={['dispatcher']}>
        <CreateTripForm trucks={(trucks as any) ?? []} drivers={(drivers as any) ?? []} />
      </RoleGate>

      <DispatchTripsList trips={(trips as any) ?? []} />
    </div>
  );
}
