import { z } from 'zod';

// Mirrors attendance_logs — "Log Daily Attendance" (Admin Staff)
export const attendanceLogSchema = z.object({
  employee_id: z.string().uuid(),
  log_date: z.string(), // ISO date
  time_in: z.string().optional(),
  time_out: z.string().optional(),
  hours_worked: z.coerce.number().min(0).max(24),
});
export type AttendanceLogInput = z.infer<typeof attendanceLogSchema>;

// Mirrors payroll_approvals — "Approved by Management?" gateway
export const payrollApprovalSchema = z.object({
  payroll_cutoff_id: z.string().uuid(),
  decision: z.enum(['approved', 'revision_needed']),
  reason: z.string().optional(),
});
export type PayrollApprovalInput = z.infer<typeof payrollApprovalSchema>;
