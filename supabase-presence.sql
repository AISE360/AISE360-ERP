-- ============================================================
-- Team presence: last-seen tracking for "who is online" display
-- Run in Supabase SQL editor (safe to re-run)
-- ============================================================

alter table profiles add column if not exists last_seen_at timestamptz;

create index if not exists idx_profiles_last_seen on profiles(last_seen_at);
