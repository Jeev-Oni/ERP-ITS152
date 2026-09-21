'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  attendanceLogSchema,
  payrollApprovalSchema,
  type AttendanceLogInput,
  type PayrollApprovalInput,
} from '@/lib/validations/salary-distribution';

/**
 * "Log Daily Attendance" — Admin Staff.
 * RLS (0007_rls_policies.sql: attendance_write_admin_staff) enforces the role check
 * server-side too, so this is defense in depth, not the only guard.
 */
export async function logAttendance(input: AttendanceLogInput) {
  const parsed = attendanceLogSchema.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('attendance_logs').insert({
    ...parsed,
    logged_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath('/hr/attendance');
  return { success: true };
}

/**
 * "Compute Hours, OT & Deductions" — HR/Payroll Officer.
 * Moves payroll_cutoffs.status: closed -> computed (or revision_needed -> computed
 * on a re-run after a rejection).
 */
export async function computePayroll(payrollCutoffId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Pull attendance for the cutoff period and compute pay per employee.
  // (Left as a stub — wire this to your actual attendance_logs date range once the
  // cutoff's period_start/period_end are on hand.)
  const { data: cutoff, error: cutoffError } = await supabase
    .from('payroll_cutoffs')
    .select('*')
    .eq('id', payrollCutoffId)
    .single();
  if (cutoffError || !cutoff) return { error: cutoffError?.message ?? 'Cutoff not found' };

  const { error: updateError } = await supabase
    .from('payroll_cutoffs')
    .update({ status: 'computed' })
    .eq('id', payrollCutoffId);
  if (updateError) return { error: updateError.message };

  revalidatePath('/hr/payroll');
  return { success: true };
}

/**
 * "Approved by Management?" gateway — Management only (enforced by RLS).
 * decision === 'approved'      -> payroll_cutoffs.status: computed -> approved
 * decision === 'revision_needed' -> payroll_cutoffs.status: computed -> revision_needed
 * (the "Revise Computation" loop back into computePayroll()).
 */
export async function decidePayrollApproval(input: PayrollApprovalInput) {
  const parsed = payrollApprovalSchema.parse(input);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error: approvalError } = await supabase.from('payroll_approvals').insert({
    ...parsed,
    decided_by: user.id,
  });
  if (approvalError) return { error: approvalError.message };

  const nextStatus = parsed.decision === 'approved' ? 'approved' : 'revision_needed';
  const { error: statusError } = await supabase
    .from('payroll_cutoffs')
    .update({ status: nextStatus })
    .eq('id', parsed.payroll_cutoff_id);
  if (statusError) return { error: statusError.message };

  revalidatePath('/hr/payroll');
  return { success: true };
}

/**
 * "Disburse Pay via Bank Transfer" — Finance only (enforced by RLS).
 * Idempotent: re-running against an already-disbursed cutoff is a no-op, since bank
 * transfers can't be un-sent (see docs/process-flows/salary-distribution.md).
 */
export async function disbursePay(payrollCutoffId: string, bankReference?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: cutoff } = await supabase
    .from('payroll_cutoffs')
    .select('status')
    .eq('id', payrollCutoffId)
    .single();

  if (cutoff?.status === 'disbursed') {
    return { success: true, note: 'Already disbursed — no action taken.' };
  }

  const { error: disburseError } = await supabase.from('payroll_disbursements').insert({
    payroll_cutoff_id: payrollCutoffId,
    disbursed_by: user.id,
    bank_reference: bankReference,
  });
  if (disburseError) return { error: disburseError.message };

  const { error: statusError } = await supabase
    .from('payroll_cutoffs')
    .update({ status: 'disbursed' })
    .eq('id', payrollCutoffId);
  if (statusError) return { error: statusError.message };

  revalidatePath('/hr/payroll');
  return { success: true };
}
