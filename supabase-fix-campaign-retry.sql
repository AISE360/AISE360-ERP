-- ============================================================
-- FoundersHub — CAMPAIGN RETRY QUEUE (failed -> retry -> empty cycle)
-- Run this in your Supabase SQL editor (safe to re-run)
-- Fixes: 50 sent / 28 failed (Resend limit) -> retry next day
-- ============================================================

-- 1. Track which failed rows have been retried/cleared,
--    so the Failed Queue empties after a successful retry (cycle).
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS retried boolean NOT NULL DEFAULT false;

ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS company text;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_failed_queue
  ON campaign_recipients(status, retried, sent_at DESC);

-- 2. Failed queue: pending retries only
--    Usage in app: select * from campaign_failed_queue order by sent_at desc;
CREATE OR REPLACE VIEW campaign_failed_queue AS
SELECT
  r.id,
  r.campaign_id,
  r.name,
  r.email,
  r.company,
  r.error,
  r.sent_at,
  c.subject AS campaign_subject,
  c.created_at AS campaign_created_at
FROM campaign_recipients r
JOIN campaigns c ON c.id = r.campaign_id
WHERE r.status = 'failed' AND r.retried = false
ORDER BY r.sent_at DESC;

-- 3. One-click: clear queue after successful retry (cycle empty)
--    The app calls this after resending; new failures land as fresh rows.
--    Example: SELECT * FROM campaign_failed_queue; -> retry -> UPDATE ...
-- (no function needed — app does: UPDATE campaign_recipients SET retried = true WHERE id IN (...))
