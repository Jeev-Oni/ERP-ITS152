import { roleLabel } from '@/lib/roles';

const STEPS = [
  { key: 'open', label: 'Open', who: 'HR opens it, staff log attendance' },
  { key: 'closed', label: 'Closed', who: 'HR' },
  { key: 'computed', label: 'Computed', who: 'HR, then Management reviews' },
  { key: 'approved', label: 'Approved', who: 'Management' },
  { key: 'disbursed', label: 'Disbursed', who: 'Finance' },
];

// Which step a status sits on (revision_needed/pending_approval are loops on "Computed").
const STEP_INDEX: Record<string, number> = {
  open: 0, closed: 1, computed: 2, pending_approval: 2, revision_needed: 2, approved: 3, disbursed: 4,
};

// Whose turn it is, and what they do. `roles` are the ones who can act at this status.
const NEXT: Record<string, { roles: string[]; text: string }> = {
  open: {
    roles: ['hr_payroll_officer'],
    text: 'Admin Staff (or HR) log attendance each day. When the period has ended, HR clicks Close Cutoff.',
  },
  closed: {
    roles: ['hr_payroll_officer'],
    text: 'HR clicks Compute Payroll. This reads every active employee\'s attendance for the period and works out hours and gross pay. Attendance can still be corrected until you compute.',
  },
  computed: {
    roles: ['management', 'hr_payroll_officer'],
    text: 'HR types each employee\'s deductions below (the only pay figure entered by hand). Management then approves, or sends it back. If HR spots a wrong attendance entry first, HR can use Send Back for Correction.',
  },
  pending_approval: { roles: ['management'], text: 'Management approves or sends it back.' },
  revision_needed: {
    roles: ['hr_payroll_officer'],
    text: 'This was sent back. HR fixes the attendance entries or deductions, then clicks Recompute Payroll.',
  },
  approved: {
    roles: ['finance', 'hr_payroll_officer'],
    text: 'Finance disburses pay by bank transfer. HR can generate the payslips.',
  },
  disbursed: { roles: [], text: 'Done. Pay has been disbursed and this cutoff is now a permanent record.' },
};

export function PayrollProgress({ status, role }: { status: string; role: string }) {
  const current = STEP_INDEX[status] ?? 0;
  const next = NEXT[status];
  const myTurn = !!next && (role === 'system_admin' || next.roles.includes(role));
  const waitingFor = next?.roles.map(roleLabel).join(' or ');

  return (
    <div className="space-y-3 panel p-5">
      <ol className="flex flex-wrap gap-x-6 gap-y-3">
        {STEPS.map((step, i) => {
          const done = i < current || status === 'disbursed';
          const active = i === current && status !== 'disbursed';
          return (
            <li key={step.key} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                    ? 'border-2 border-primary text-primary'
                    : 'border border-border text-muted-foreground'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={active ? 'text-foreground' : 'text-muted-foreground'}>
                <span className="block text-sm font-medium">{step.label}</span>
                <span className="block text-[11px]">{step.who}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {status === 'revision_needed' && (
        <p className="text-xs text-amber-300">Sent back for revision. This loops back into Computed.</p>
      )}

      {next && (
        <p className="text-sm">
          <span className={`font-medium ${myTurn ? 'text-primary' : 'text-muted-foreground'}`}>
            {status === 'disbursed' ? 'Finished.' : myTurn ? 'Your turn.' : `Waiting for ${waitingFor}.`}
          </span>{' '}
          <span className="text-muted-foreground">{next.text}</span>
        </p>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer text-foreground">How pay is calculated</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Each day counts up to 8 hours as regular hours. Anything over 8 in a day is overtime.</li>
          <li>Hourly rate = the employee&apos;s daily rate ÷ 8.</li>
          <li>Gross pay = regular hours × rate, plus overtime hours × rate × 1.25.</li>
          <li>Net pay = gross pay − deductions (SSS, PhilHealth, Pag-IBIG, tax, cash advance…). Deductions start at 0 and are typed in per employee.</li>
          <li>Hours come from the Attendance page. To change hours, correct the attendance entry, then Recompute Payroll. Only active employees are included.</li>
        </ul>
      </details>
    </div>
  );
}
