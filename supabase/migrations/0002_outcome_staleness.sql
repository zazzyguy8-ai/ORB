-- ---------------------------------------------------------------------------
-- Outcome staleness
-- ---------------------------------------------------------------------------
-- A "+5 min" checkpoint priced four hours after the call is not a +5 min
-- outcome. The worker may fall behind — a sleeping free-tier instance, a
-- provider outage, a scheduler that missed a beat — and when it does, the
-- honest move is to drop the checkpoint rather than to record a number under a
-- label it no longer fits.
--
-- 'stale' is that outcome. It is deliberately not 'failed': failed means we
-- could not get a price, stale means we got one too late to mean anything, and
-- collapsing the two would hide a systematic problem behind provider noise.
--
-- Safe to re-run.
alter table public.analysis_outcomes
  drop constraint if exists analysis_outcomes_status_check;

alter table public.analysis_outcomes
  add constraint analysis_outcomes_status_check
  check (status in ('pending', 'recorded', 'failed', 'stale'));

-- How far behind schedule the worker was when it touched the row. Recorded for
-- successful checkpoints too, so drift is visible before it becomes staleness.
alter table public.analysis_outcomes
  add column if not exists late_by_seconds integer;
