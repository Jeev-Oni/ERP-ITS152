'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeMaintenance } from '@/lib/actions/trucking-logistics';

type Job = { id: string; scheduled_date: string; status: string; trucks?: { plate_number: string } | null };

export function MaintenanceList({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleComplete(id: string) {
    setPendingId(id);
    await completeMaintenance(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2">Truck</th>
          <th>Scheduled Date</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="border-b border-border">
            <td className="py-2">{job.trucks?.plate_number ?? '—'}</td>
            <td>{job.scheduled_date}</td>
            <td className="capitalize">{job.status}</td>
            <td>
              {job.status === 'scheduled' && (
                <button
                  onClick={() => handleComplete(job.id)}
                  disabled={pendingId === job.id}
                  className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover"
                >
                  Mark Completed
                </button>
              )}
            </td>
          </tr>
        ))}
        {jobs.length === 0 && (
          <tr><td colSpan={4} className="py-4 text-muted-foreground">No maintenance jobs scheduled.</td></tr>
        )}
      </tbody>
    </table>
  );
}
