-- Early-season model-uncertainty cap: true when a >5 pt model edge in weeks 1-6
-- (without Kalshi corroboration) forced the tier down to Lean.
alter table if exists public.pick_log
  add column if not exists early_uncertainty boolean;
