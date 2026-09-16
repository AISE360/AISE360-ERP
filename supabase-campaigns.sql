-- ============================================================
-- FoundersHub — EMAIL CAMPAIGNS (one-click bulk mailer)
-- Run this in your Supabase SQL editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. CAMPAIGNS (one row per bulk send)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject text NOT NULL,
  headline text,
  message text,
  cta_text text,
  mode text NOT NULL DEFAULT 'promo',
  audience_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. CAMPAIGN RECIPIENTS (per-mail delivery log)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text,
  email text NOT NULL,
  company text,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);

-- ─────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Authenticated users can do everything on campaigns'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on campaigns"
      ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_recipients' AND policyname = 'Authenticated users can do everything on campaign_recipients'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on campaign_recipients"
      ON campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$;
