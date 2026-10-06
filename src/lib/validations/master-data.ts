import { z } from 'zod';

// Form fields arrive as strings; blank optional fields must become `undefined`, not "" or NaN.
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const text = (label: string) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`);
const optText = z.preprocess(blank, z.string().trim().optional());
const optNum = (label: string) =>
  z.preprocess(blank, z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} can't be negative`).optional());
const optDate = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional());
const uuid = (label: string) => z.string({ required_error: `${label} is required` }).uuid(`${label} is required`);

export const employeeSchema = z.object({
  employee_code: text('Employee code'),
  full_name: text('Full name'),
  position: optText,
  daily_rate: z.coerce.number({ invalid_type_error: 'Daily rate must be a number' }).positive('Daily rate must be greater than 0'),
  bank_account_number: optText,
});

export const attendanceUpdateSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  time_in: optText,
  time_out: optText,
  hours_worked: z.coerce.number({ invalid_type_error: 'Hours must be a number' }).min(0, 'Hours must be 0 or more').max(24, 'Hours cannot exceed 24'),
});

export const cutoffSchema = z
  .object({
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid start date'),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid end date'),
  })
  .refine((v) => v.period_end >= v.period_start, { message: 'Period end must be on or after the start', path: ['period_end'] });

export const itemUpdateSchema = z.object({
  sku: text('SKU'),
  name: text('Name'),
  unit: text('Unit'),
  reorder_point: optNum('Reorder point'),
});

export const binSchema = z.object({
  bin_code: text('Bin code'),
  zone: optText,
  capacity: optNum('Capacity'),
});

export const truckSchema = z.object({
  plate_number: text('Plate number'),
  model: optText,
  capacity_kg: optNum('Capacity'),
  next_maintenance_due: optDate,
});

export const driverSchema = z.object({
  full_name: text('Full name'),
  license_number: optText,
});

export const tripUpdateSchema = z.object({
  truck_id: uuid('Truck'),
  driver_id: uuid('Driver'),
  client_name: text('Client'),
  destination_address: text('Destination'),
});

export const maintenanceDateSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
});

export const ROLES = [
  'admin_staff', 'hr_payroll_officer', 'management', 'finance',
  'warehouse_staff', 'warehouse_supervisor',
  'dispatcher', 'driver', 'fleet_supervisor', 'system_admin',
] as const;
export const DEPARTMENTS = ['hr_administration', 'warehouse_operations', 'delivery_logistics', 'executive'] as const;

export const createUserSchema = z.object({
  full_name: text('Full name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Choose a role' }) }),
  department: z.enum(DEPARTMENTS, { errorMap: () => ({ message: 'Choose a department' }) }),
});
