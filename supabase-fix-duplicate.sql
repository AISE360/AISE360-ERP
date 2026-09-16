-- ============================================================
-- FoundersHub — REMOVE VIRTEX DUPLICATE ENTRY (confirmed)
-- The app shows 17 service entries vs 16 in the sheet.
-- Confirmed: extra row duplicates Virtex (9500/3800) with a
-- wrong expense of 3600. This script previews it, then deletes
-- ONLY that exact row. Everything else is untouched.
-- Run in Supabase SQL editor.
-- ============================================================

-- STEP 1 — Preview (run first, check it returns exactly 1 row):
SELECT e.entry_date, c.company_name, e.service_name,
       e.expense_amount, e.charged_amount, e.advance_amount, e.remarks
FROM financial_entries e
JOIN clients c ON c.id = e.client_id
WHERE e.charged_amount = 9500
  AND e.advance_amount = 3800
  AND e.expense_amount = 3600;

-- STEP 2 — Delete (run after confirming Step 1 shows 1 row):
-- DELETE FROM financial_entries
-- WHERE charged_amount = 9500
--   AND advance_amount = 3800
--   AND expense_amount = 3600;

-- Expected totals after delete:
-- Charged 1,60,795 | Advance 81,220 | Service Expenses 26,812
