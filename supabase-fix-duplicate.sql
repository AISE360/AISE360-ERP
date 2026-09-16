-- ============================================================
-- FoundersHub — SURGICAL FIXES (confirmed, safe to run)
-- 1) Delete the Virtex duplicate entry (09-09, exp 1600) by ID.
--    Original Virtex row (1456, backed by Axis #15) is untouched.
-- 2) Insert the 5 missing Axis bank-fee rows (NEW UUIDs only —
--    no existing row is modified).
-- Live user edits (PEES 12k, re-dates, BNI Akurdi) are preserved.
-- Run in Supabase SQL editor, or via CLI.
-- ============================================================

-- STEP 1 — Preview the duplicate (expect exactly 1 row):
SELECT entry_date, service_name, expense_amount, charged_amount, advance_amount
FROM financial_entries
WHERE id = 'a960457a-f8af-403b-a3e0-c5ee1ad98d46';

-- STEP 2 — Delete ONLY that row:
-- DELETE FROM financial_entries
-- WHERE id = 'a960457a-f8af-403b-a3e0-c5ee1ad98d46';

-- STEP 3 — Insert missing Axis bank-fee company expenses:
-- INSERT INTO company_expenses (id, expense_date, category, description, amount, remarks)
-- VALUES
--   ('44444444-0001-0001-0001-000000000101', DATE '2026-03-12', 'Bank Charges', 'Debit card charges + GST', 295, 'Axis #2'),
--   ('44444444-0001-0001-0001-000000000102', DATE '2026-05-14', 'Bank Charges', 'Monthly service charges APR + GST', 118, 'Axis #10-11'),
--   ('44444444-0001-0001-0001-000000000103', DATE '2026-06-16', 'Bank Charges', 'Monthly service charges MAY + GST', 118, 'Axis #18-19'),
--   ('44444444-0001-0001-0001-000000000104', DATE '2026-07-16', 'Bank Charges', 'Monthly service charges JUN + GST', 118, 'Axis #26-27'),
--   ('44444444-0001-0001-0001-000000000105', DATE '2026-08-21', 'Bank Charges', 'Monthly service charges JUL + GST', 118, 'Axis #42-43')
-- ON CONFLICT (id) DO NOTHING;

-- STEP 4 — Verify (expect 16 entries / 13 company rows):
-- SELECT
--   (SELECT COUNT(*) FROM financial_entries) AS entries,
--   (SELECT SUM(charged_amount) FROM financial_entries) AS charged,
--   (SELECT SUM(advance_amount) FROM financial_entries) AS advance,
--   (SELECT SUM(expense_amount) FROM financial_entries) AS svc_exp,
--   (SELECT COUNT(*) FROM company_expenses) AS co_rows,
--   (SELECT SUM(amount) FROM company_expenses) AS co_exp;
-- Expect: 16 | 160795 | 81220 | 28812 | 13 | 31932
