-- 0001_extensions_and_enums.sql
-- Shared extensions and enum types used across all four processes.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Roles, taken directly from the "Key roles" list under each process in the source doc.
create type app_role as enum (
  'admin_staff',
  'hr_payroll_officer',
  'management',
  'finance',
  'warehouse_staff',
  'warehouse_supervisor',
  'dispatcher',
  'driver',
  'fleet_supervisor',
  'system_admin'
);

create type department as enum (
  'hr_administration',
  'warehouse_operations',
  'delivery_logistics',
  'executive'
);

-- Process 1: Salary Distribution
create type payroll_cutoff_status as enum (
  'open', 'closed', 'computed', 'pending_approval',
  'approved', 'revision_needed', 'disbursed'
);

-- Process 2: Warehouse Recording
create type stock_movement_type as enum ('receipt', 'issue');
create type stock_movement_status as enum (
  'pending', 'logged', 'matched', 'discrepancy', 'investigating', 'verified'
);

-- Process 3: Trucking Logistics
create type trip_status as enum (
  'dispatched', 'en_route', 'delivered', 'delivery_failed', 'rescheduled', 'closed'
);
