'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  attendanceLogSchema,
  payrollApprovalSchema,
  type AttendanceLogInput,
  type PayrollApprovalInput,
} from '@/lib/validations/salary-distribution';
import { attendanceUpdateSchema, cutoffSchema, employeeSchema } from '@/lib/validations/master-data';
import { dbError, noRowsAffected, type ActionResult } from './result';

// Ordinary overtime multiplier. Adjust to match actual company/labor-code policy —
// this is a placeholder so the pipeline is demonstrably end-to-end, not a payroll-law claim.
const OVERTIME_MULTIPLIER = 1.25;

/**
 * "Cutoff Period Begins" — opens a new payroll_cutoffs row for Admin Staff to log
 * attendance against. RLS restricts this to hr_payroll_officer (0007_rls_policies.sql).
 */
export async function createPayrollCutoff(periodStart: string, periodEnd: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('payroll_cutoffs')
    .insert({ period_start: periodStart, period_end: periodEnd, status: 'open' });
  if (error) return { error: error.message };

  revalidatePath('/hr/payroll');
  return { success: true };
}

/**
 * "Cutoff Reached?" gateway, the Yes branch — HR/Payroll Officer manually closes the
 * window once the period ends, which unlocks Compute Payroll.
 */
export async function closeCutoff(payrollCutoffId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('payroll_cutoffs')
    .update({ status: 'closed' })
    .eq('id', payrollCutoffId);
  if (error) return { error: error.message };

  revalidatePath(`/hr/payroll/${payrollCutoffId}`);
  revalidatePath('/hr/payroll');
  return { success: true };
}

/** "Log Daily Attendance" — Admin Staff. */
export async function logAttendance(input: AttendanceLogInput): Promise<ActionResult> {
  const parsed = attendanceLogSchema.parse(input);
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('attendance_logs').insert({
    ...parsed,
    logged_by: user.id,
  });
  if (error) {
    return dbError(error, {
      duplicate: 'Attendance for that employee on that date is already logged. Edit the existing entry instead.',
    });
  }

  revalidatePath('/hr/attendance');
  return { success: true };
}

/**
 * "Compute Hours, OT & Deductions" — HR/Payroll Officer.
 * Pulls every active employee's attendance_logs within the cutoff's date range, splits
 * each day into regular (up to 8h) and overtime (anything beyond), and writes one
 * payroll_computations row per employee. Deductions default to 0 — HR adjusts them per
 * employee afterward via updateComputationDeductions() (company-specific: SSS,
 * PhilHealth, Pag-IBIG, tax, cash advances, etc. are not hardcoded here).
 * Re-running this after a "Revise Computation" loop overwrites the prior computation
 * for each employee (upsert on the payroll_cutoff_id + employee_id unique constraint).
 */
export async function computePayroll(payrollCutoffId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: cutoff, error: cutoffError } = await supabase
    .from('payroll_cutoffs')
    .select('*')
    .eq('id', payrollCutoffId)
    .single();
  if (cutoffError || !cutoff) return { error: cutoffError?.message ?? 'Cutoff not found' };

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, daily_rate')
    .eq('is_active', true);
  if (empError) return { error: empError.message };

  for (const employee of employees ?? []) {
    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('hours_worked')
      .eq('employee_id', employee.id)
      .gte('log_date', cutoff.period_start)
      .lte('log_date', cutoff.period_end);

    let regularHours = 0;
    let overtimeHours = 0;
    for (const log of logs ?? []) {
      const hours = Number(log.hours_worked ?? 0);
      regularHours += Math.min(hours, 8);
      overtimeHours += Math.max(hours - 8, 0);
    }

    const hourlyRate = Number(employee.daily_rate) / 8;
    const grossPay = regularHours * hourlyRate + overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;
    const deductions = 0;
    const netPay = grossPay - deductions;

    const { error: upsertError } = await supabase.from('payroll_computations').upsert(
      {
        payroll_cutoff_id: payrollCutoffId,
        employee_id: employee.id,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        deductions,
        gross_pay: grossPay,
        net_pay: netPay,
        computed_by: user.id,
      },
      { onConflict: 'payroll_cutoff_id,employee_id' }
    );
    if (upsertError) return { error: upsertError.message };
  }

  const { error: statusError } = await supabase
    .from('payroll_cutoffs')
    .update({ status: 'computed' })
    .eq('id', payrollCutoffId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/hr/payroll/${payrollCutoffId}`);
  revalidatePath('/hr/payroll');
  return { success: true };
}

/**
 * HR adjusts one employee's deductions after Compute Payroll runs, before sending the
 * cutoff to Management for approval. Recalculates net_pay from the stored gross_pay.
 */
export async function updateComputationDeductions(computationId: string, deductions: number) {
  const supabase = createClient();

  const { data: computation, error: fetchError } = await supabase
    .from('payroll_computations')
    .select('gross_pay, payroll_cutoff_id')
    .eq('id', computationId)
    .single();
  if (fetchError || !computation) return { error: fetchError?.message ?? 'Computation not found' };

  const netPay = Number(computation.gross_pay) - deductions;
  const { error } = await supabase
    .from('payroll_computations')
    .update({ deductions, net_pay: netPay })
    .eq('id', computationId);
  if (error) return { error: error.message };

  revalidatePath(`/hr/payroll/${computation.payroll_cutoff_id}`);
  return { success: true };
}

/**
 * "Approved by Management?" gateway — Management only (enforced by RLS).
 * decision === 'approved'        -> payroll_cutoffs.status: computed -> approved
 * decision === 'revision_needed' -> payroll_cutoffs.status: computed -> revision_needed
 * (the "Revise Computation" loop, which sends HR back to computePayroll()).
 */
export async function decidePayrollApproval(input: PayrollApprovalInput) {
  const parsed = payrollApprovalSchema.parse(input);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  revalidatePath(`/hr/payroll/${parsed.payroll_cutoff_id}`);
  return { success: true };
}

/**
 * "Disburse Pay via Bank Transfer" — Finance only (enforced by RLS).
 * Idempotent: re-running against an already-disbursed cutoff is a no-op, since bank
 * transfers can't be un-sent (see docs/process-flows/salary-distribution.md).
 */
export async function disbursePay(payrollCutoffId: string, bankReference?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  revalidatePath(`/hr/payroll/${payrollCutoffId}`);
  return { success: true };
}

/**
 * "Generate Digital Payslip" — HR/Payroll Officer.
 * Creates one payslips row per payroll_computation in this cutoff that doesn't already
 * have one. No PDF library is wired in here — the payslip detail page renders a
 * print-ready view instead (browser Print -> Save as PDF covers the same use case
 * without adding a rendering dependency to the scaffold).
 */
export async function generatePayslips(payrollCutoffId: string) {
  const supabase = createClient();

  const { data: computations, error } = await supabase
    .from('payroll_computations')
    .select('id')
    .eq('payroll_cutoff_id', payrollCutoffId);
  if (error) return { error: error.message };

  const computationIds = (computations ?? []).map((c) => c.id);
  const { data: existing } = await supabase
    .from('payslips')
    .select('payroll_computation_id')
    .in('payroll_computation_id', computationIds);

  const existingIds = new Set((existing ?? []).map((p) => p.payroll_computation_id));
  const toInsert = computationIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ payroll_computation_id: id }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('payslips').insert(toInsert);
    if (insertError) return { error: insertError.message };
  }

  revalidatePath('/hr/payslips');
  revalidatePath(`/hr/payroll/${payrollCutoffId}`);
  return { success: true, generated: toInsert.length };
}

// ============================================================
// Employee Master — HR / Payroll Officer (RLS: employees_write)
// ============================================================

function employeeFields(p: ReturnType<typeof employeeSchema.parse>) {
  return {
    employee_code: p.employee_code,
    full_name: p.full_name,
    position: p.position ?? null,
    daily_rate: p.daily_rate,
    bank_account_number: p.bank_account_number ?? null,
  };
}

export async function createEmployee(input: unknown): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { error } = await supabase.from('employees').insert(employeeFields(parsed.data));
  if (error) return dbError(error, { duplicate: 'That employee code is already in use.' });

  revalidatePath('/hr/employees');
  return { success: true };
}

export async function updateEmployee(id: string, input: unknown): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase.from('employees').update(employeeFields(parsed.data)).eq('id', id).select('id');
  if (error) return dbError(error, { duplicate: 'That employee code is already in use.' });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/hr/employees');
  revalidatePath('/hr/attendance');
  return { success: true };
}

/** Soft-disable: keeps all attendance/payroll history, and drops them from future cutoffs. */
export async function setEmployeeActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected();

  revalidatePath('/hr/employees');
  revalidatePath('/hr/attendance');
  return { success: true };
}

/**
 * Hard delete, only for employees with no history. attendance_logs cascade on delete, so
 * without this check a delete would silently wipe someone's attendance records.
 */
export async function deleteEmployee(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const inUse = 'This employee has attendance or payroll history. Deactivate them instead of deleting.';

  const { count, error: countError } = await supabase
    .from('attendance_logs')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', id);
  if (countError) return dbError(countError);
  if (count && count > 0) return { error: inUse };

  const { data, error } = await supabase.from('employees').delete().eq('id', id).select('id');
  if (error) return dbError(error, { inUse });
  if (!data?.length) return noRowsAffected();

  revalidatePath('/hr/employees');
  return { success: true };
}

// ============================================================
// Attendance — Admin Staff. RLS freezes rows once payroll for the period is computed.
// ============================================================

const LOCKED_MSG =
  'This attendance entry is locked: payroll for its period has already been computed. ' +
  'Ask HR to send the cutoff back for revision first.';

export async function updateAttendance(id: string, input: unknown): Promise<ActionResult> {
  const parsed = attendanceUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('attendance_logs')
    .update({
      log_date: parsed.data.log_date,
      time_in: parsed.data.time_in ?? null,
      time_out: parsed.data.time_out ?? null,
      hours_worked: parsed.data.hours_worked,
    })
    .eq('id', id)
    .select('id');
  if (error) return dbError(error, { duplicate: 'That employee already has an entry for that date.' });
  if (!data?.length) return noRowsAffected(LOCKED_MSG);

  revalidatePath('/hr/attendance');
  return { success: true };
}

export async function deleteAttendance(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('attendance_logs').delete().eq('id', id).select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected(LOCKED_MSG);

  revalidatePath('/hr/attendance');
  return { success: true };
}

// ============================================================
// Payroll cutoffs — HR. Only editable/deletable while still 'open'.
// ============================================================

export async function updatePayrollCutoff(id: string, input: unknown): Promise<ActionResult> {
  const parsed = cutoffSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  // .eq('status','open') so a period can't be re-dated after attendance has been computed.
  const { data, error } = await supabase
    .from('payroll_cutoffs')
    .update({ period_start: parsed.data.period_start, period_end: parsed.data.period_end })
    .eq('id', id)
    .eq('status', 'open')
    .select('id');
  if (error) return dbError(error, { duplicate: 'A cutoff for exactly that period already exists.' });
  if (!data?.length) return noRowsAffected('Only an open cutoff can be edited.');

  revalidatePath('/hr/payroll');
  return { success: true };
}

export async function deletePayrollCutoff(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from('payroll_cutoffs').delete().eq('id', id).eq('status', 'open').select('id');
  if (error) return dbError(error);
  if (!data?.length) return noRowsAffected('Only an open cutoff can be deleted.');

  revalidatePath('/hr/payroll');
  return { success: true };
}
