-- payroll_lock_diagnostics.sql
-- Run in the Supabase SQL editor (runs as the service role, so RLS does not get in the way).
-- NOT a migration. Do not put this in supabase/migrations/.

-- ============================================================
-- 1. WHY is a date locked?  (change the date)
--    Any row returned with status computed / pending_approval / approved / disbursed
--    makes attendance for that date read-only (is_attendance_locked, migration 0009).
-- ============================================================
select id, period_start, period_end, status
from payroll_cutoffs
where date '2026-10-13' between period_start and period_end
order by period_start;

-- ============================================================
-- 2. Every cutoff and whether it currently locks its dates
-- ============================================================
select id, period_start, period_end, status,
       status in ('computed','pending_approval','approved','disbursed') as locks_attendance
from payroll_cutoffs
order by period_start desc;

-- ============================================================
-- 3. Overlapping cutoffs.  The table only forbids two cutoffs with the EXACT same dates,
--    so e.g. 09-01..10-31 and 10-01..10-15 can both exist, and the first one locks the second.
-- ============================================================
select a.id as a_id, a.period_start as a_start, a.period_end as a_end, a.status as a_status,
       b.id as b_id, b.period_start as b_start, b.period_end as b_end, b.status as b_status
from payroll_cutoffs a
join payroll_cutoffs b on a.id < b.id
 and a.period_start <= b.period_end and b.period_start <= a.period_end;

-- ============================================================
-- 4. Did migrations 0009 / 0010 run?  If you are logged in as HR / Payroll Officer, the
--    insert policy's with_check must mention hr_payroll_officer (0010). If it does not,
--    HR gets the same "no permission" error even on an unlocked date.
-- ============================================================
select policyname, cmd, with_check
from pg_policies
where tablename = 'attendance_logs' and cmd = 'INSERT';

-- ============================================================
-- 5. DEV / TEST ONLY — put one cutoff back to 'open' so you can run the whole flow again.
--    Deletes its computations (payslips cascade), approvals and disbursement record.
--    NEVER run against real payroll: a disbursed cutoff represents money already sent.
-- ============================================================
-- begin;
--   delete from payroll_disbursements where payroll_cutoff_id = '<cutoff uuid>';
--   delete from payroll_approvals     where payroll_cutoff_id = '<cutoff uuid>';
--   delete from payroll_computations  where payroll_cutoff_id = '<cutoff uuid>';
--   update payroll_cutoffs set status = 'open' where id = '<cutoff uuid>';
-- commit;

-- ============================================================
-- 6. OPTIONAL — stop overlapping cutoffs from being created at all.
--    UNTESTED against your database. It will fail if query 3 above returns rows; fix those first.
-- ============================================================
-- create extension if not exists btree_gist;
-- alter table payroll_cutoffs
--   add constraint payroll_cutoffs_no_overlap
--   exclude using gist (daterange(period_start, period_end, '[]') with &&);
