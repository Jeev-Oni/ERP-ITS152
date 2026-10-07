'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditableRow, type Field } from '@/components/shared/EditableRow';
import { ConfirmButton } from '@/components/shared/ConfirmButton';
import {
  completeMaintenance,
  cancelMaintenance,
  deleteMaintenance,
  updateMaintenanceDate,
} from '@/lib/actions/trucking-logistics';

type Job = { id: string; scheduled_date: string; status: string; trucks?: { plate_number: string } | null };

const FIELDS: Field[] = [
  { name: 'truck', type: 'text', readOnly: true },
  { name: 'scheduled_date', type: 'date', required: true, width: 'w-36' },
];

// scheduled  -> reschedule, mark completed, or cancel
// cancelled  -> can be deleted from the list
// completed  -> kept as maintenance history (it also rolled the truck's due dates forward)
function JobRow({ job }: { job: Job }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scheduled = job.status === 'scheduled';

  async function handleComplete() {
    setPending(true);
    setError(null);
    const result = await completeMaintenance(job.id);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <>
      <EditableRow
        fields={FIELDS}
        values={{ truck: job.trucks?.plate_number ?? '—', scheduled_date: job.scheduled_date }}
        extraCells={<td className="capitalize">{job.status}</td>}
        extraActions={
          scheduled && (
            <>
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover disabled:opacity-40"
              >
                Mark Completed
              </button>
              <ConfirmButton
                label="Cancel Job"
                confirmLabel="Cancel job"
                onConfirm={() => cancelMaintenance(job.id)}
                onDone={() => router.refresh()}
                onError={setError}
              />
            </>
          )
        }
        canEdit={scheduled}
        canDelete={job.status === 'cancelled'}
        onSave={(v) => updateMaintenanceDate(job.id, v)}
        onDelete={() => deleteMaintenance(job.id)}
      />
      {error && <tr><td colSpan={4} className="pb-2 text-xs text-red-400">{error}</td></tr>}
    </>
  );
}

export function MaintenanceList({ jobs }: { jobs: Job[] }) {
  return (
    <div className="table-wrap">
<table className="data-table">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2">Truck</th>
          <th>Scheduled Date</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => <JobRow key={job.id} job={job} />)}
        {jobs.length === 0 && (
          <tr><td colSpan={4} className="py-4 text-muted-foreground">No maintenance jobs scheduled.</td></tr>
        )}
      </tbody>
    </table>
</div>
  );
}
