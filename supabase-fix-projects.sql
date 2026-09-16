-- ============================================================
-- FoundersHub — PROJECTS TABLE ALIGNMENT MIGRATION
-- Run this in your Supabase SQL editor (safe to re-run)
--
-- Problem: the live `projects` table has the old shape
--   (id, title, description, image_url, project_url, ...)
-- but the app (Projects, Kanban, Tasks, Finance, Invoices,
-- Financial Performance) expects the contract in
-- supabase-schema.sql:
--   (id, name, client_id, status, priority, budget,
--    upfront_received, deadline, progress, created_by, ...)
-- This migration adds the missing columns and backfills
-- `name` from the legacy `title` column. Nothing is deleted.
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS upfront_received numeric NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill display names from the legacy title column
UPDATE projects
SET name = COALESCE(NULLIF(title, ''), 'Untitled Project')
WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
