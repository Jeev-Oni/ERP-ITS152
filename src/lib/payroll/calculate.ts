// Pure payroll math. No database, no Next.js, no side effects.
//
// Both computePayroll() (real run, writes rows, locks attendance) and previewPayroll()
// (simulation, writes nothing) call this same function, so a simulation can never drift
// from what the real run will produce.

export type PayrollPolicy = {
  /** Hours in a normal working day. Hourly rate = daily_rate / this. */
  regularHoursPerDay: number;
  /** Pay multiplier for overtime hours (1.25 = +25%). Placeholder company policy. */
  overtimeMultiplier: number;
  /**
   * Overtime only counts when the hours beyond regularHoursPerDay reach this many hours.
   * 0 = every minute over counts (the original behaviour). Setting 0.5 stops 8.07-hour
   * days (clock-in jitter) from creating 0.07 hours of "overtime".
   */
  overtimeThresholdHours: number;
};

export const DEFAULT_POLICY: PayrollPolicy = {
  regularHoursPerDay: 8,
  overtimeMultiplier: 1.25,
  overtimeThresholdHours: 0,
};

export type PayrollLine = {
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  deductions: number;
  netPay: number;
};

/** Round to centavos. The epsilon avoids 1.005 -> 1 style floating-point surprises. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * @param hoursPerDay  one number per attendance log in the period (hours_worked)
 * @param dailyRate    employees.daily_rate
 * @param deductions   total deductions for the period (manual, or computed elsewhere)
 */
export function calculateEmployeePay(
  hoursPerDay: Array<number | string | null | undefined>,
  dailyRate: number,
  deductions = 0,
  policy: PayrollPolicy = DEFAULT_POLICY
): PayrollLine {
  const { regularHoursPerDay, overtimeMultiplier, overtimeThresholdHours } = policy;

  let regular = 0;
  let overtime = 0;
  let days = 0;

  for (const raw of hoursPerDay) {
    const hours = Number(raw ?? 0);
    if (!Number.isFinite(hours) || hours <= 0) continue; // absent / 0 hours = no pay (no work, no pay)
    days += 1;

    regular += Math.min(hours, regularHoursPerDay);
    const excess = Math.max(hours - regularHoursPerDay, 0);
    if (excess >= overtimeThresholdHours) overtime += excess;
  }

  // Keep hourly unrounded so rounding happens once, on the money, not on every step.
  const hourlyRate = dailyRate / regularHoursPerDay;
  const regularPay = regular * hourlyRate;
  const overtimePay = overtime * hourlyRate * overtimeMultiplier;
  const grossPay = round2(regularPay + overtimePay);
  const safeDeductions = round2(Math.max(deductions, 0));

  return {
    daysWorked: days,
    regularHours: round2(regular),
    overtimeHours: round2(overtime),
    hourlyRate: round2(hourlyRate),
    regularPay: round2(regularPay),
    overtimePay: round2(overtimePay),
    grossPay,
    deductions: safeDeductions,
    // Net pay can't go below zero: a payslip showing negative pay isn't a thing you can transfer.
    netPay: round2(Math.max(grossPay - safeDeductions, 0)),
  };
}

/**
 * Hours between two "HH:MM" (or "HH:MM:SS") times, minus an unpaid break.
 * Handles night shifts that cross midnight. Used to auto-fill the Hours field.
 *
 * Matches the existing data: 07:56 -> 17:00 with a 1h break = 8.07, which is exactly
 * what the attendance rows in the UI show.
 */
export function hoursBetween(timeIn: string, timeOut: string, unpaidBreakHours = 0): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let diff = toMinutes(timeOut) - toMinutes(timeIn);
  if (diff < 0) diff += 24 * 60; // crossed midnight
  return round2(Math.max(diff / 60 - unpaidBreakHours, 0));
}
