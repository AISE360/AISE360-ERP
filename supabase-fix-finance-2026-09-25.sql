-- ============================================================
-- FoundersHub — SURGICAL FIX 25/09/2026 (confirmed, safe to run)
-- Applies founder decisions WITHOUT overwriting manual edits:
--  1) Rename Jitendra -> DailyDripCafe (same 8+8 holder, now website client)
--  2) PEES expense 10k -> 12k (10k #51 + 2k #52)
--  3) New FE-17 DailyDripCafe Website 15000/15000 (Axis #58 Jyotirlinga)
--  4) New company expenses: BNI 3600, Aug fees 118, Good Flippin 1759,
--     Farooque 250, Zaid 490, Burger 440
--  5) Bank table is refreshed via supabase-bank-statement.sql (upsert by sno)
-- Run AFTER supabase-bank-statement.sql. Safe to re-run (upserts).
-- Expect after run: entries 17 | charged 175795 | advance 96220
--   svc_exp 28812 | co_rows 18 | co_exp 34989 | bank closing 40571.76
-- ============================================================

-- 1) Rename Jitendra -> DailyDripCafe (keep contact Jitendra, assets match dailydripcafe domains)
UPDATE clients
SET company_name = 'DailyDripCafe', contact_person = 'Jitendra',
    email = 'info@dailydripcafe.shop',
    notes = 'Renamed 25/09/26: same holder of 8 domains + 8 mailboxes (incl dailydripcafe.shop/.co.in) | Website: Daily Drip Cafe (Jyotirlinga Hospitality)'
WHERE id = '11111111-0001-0001-0001-000000000001';

UPDATE projects
SET name = REPLACE(COALESCE(name, title, ''), 'Jitendra', 'DailyDripCafe'),
    title = REPLACE(COALESCE(title, name, ''), 'Jitendra', 'DailyDripCafe')
WHERE client_id = '11111111-0001-0001-0001-000000000001'
   OR id = '22222222-0001-0001-0001-000000000001';

-- New project for Daily Drip website (keeps FinancePage in sync)
INSERT INTO projects (id, name, title, description, client_id, status, priority, budget, upfront_received)
VALUES
  ('22222222-0001-0001-0001-000000000014', 'DailyDripCafe – Website',
   'DailyDripCafe – Website', 'Daily Drip Cafe website (Option A 15k upfront, quotation 01/08/26) | Axis #58 Jyotirlinga 15k',
   '11111111-0001-0001-0001-000000000001', 'active', 'medium', 15000, 15000)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title,
  description = EXCLUDED.description, budget = EXCLUDED.budget, upfront_received = EXCLUDED.upfront_received;

-- 2) PEES 10k -> 12k (website values correct per founder)
UPDATE financial_entries
SET expense_amount = 12000,
    remarks = '12k given to Farooque bhai (Axis #44 adv 7400, #51 10k + #52 2k)',
    updated_at = now()
WHERE id = '33333333-0001-0001-0001-000000000014';

-- 3) FE-17 Daily Drip website 15k/15k (Vision stays mail-only 3297 locked)
INSERT INTO financial_entries (id, client_id, project_id, service_name, entry_date, expense_amount, charged_amount, advance_amount, remarks)
VALUES
  ('33333333-0001-0001-0001-000000000017',
   '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000014',
   'Website', DATE '2026-09-25', 0, 15000, 15000,
   'Daily Drip Cafe website upfront (Option A) - Axis #58 Jyotirlinga Hospitality 15k')
ON CONFLICT (id) DO UPDATE SET expense_amount = EXCLUDED.expense_amount,
  charged_amount = EXCLUDED.charged_amount, advance_amount = EXCLUDED.advance_amount,
  remarks = EXCLUDED.remarks, project_id = EXCLUDED.project_id;

-- 4) Company expenses (confirmed 25/09, all paid via Axis)
INSERT INTO company_expenses (id, expense_date, category, description, amount, remarks)
VALUES
  ('44444444-0001-0001-0001-000000000013', DATE '2026-09-11', 'Business Meeting', 'BNI Akurdi meet (900 x 4) via Dada Bhapkar', 3600, 'Axis #53 - confirmed'),
  ('44444444-0001-0001-0001-000000000014', DATE '2026-09-18', 'Bank Charges', 'Monthly service charges AUG + GST', 118, 'Axis #54-55'),
  ('44444444-0001-0001-0001-000000000015', DATE '2026-09-03', 'Food/Travel', 'Good Flippin Burgers - business food', 1759, 'Axis #48 - confirmed company expense'),
  ('44444444-0001-0001-0001-000000000016', DATE '2026-09-03', 'Miscellaneous', 'Farooque 250', 250, 'Axis #49 - confirmed company expense'),
  ('44444444-0001-0001-0001-000000000017', DATE '2026-09-20', 'Miscellaneous', 'Zaid transfer 490', 490, 'Axis #56 - confirmed company expense'),
  ('44444444-0001-0001-0001-000000000018', DATE '2026-09-21', 'Food/Travel', 'Burger 440', 440, 'Axis #57 - confirmed company expense')
ON CONFLICT (id) DO UPDATE SET expense_date = EXCLUDED.expense_date, category = EXCLUDED.category,
  description = EXCLUDED.description, amount = EXCLUDED.amount, remarks = EXCLUDED.remarks;

-- 5) Verify (run these SELECTs after):
-- SELECT COUNT(*), SUM(charged_amount), SUM(advance_amount), SUM(expense_amount) FROM financial_entries;
-- Expect: 17 | 175795 | 96220 | 28812
-- SELECT COUNT(*), SUM(amount) FROM company_expenses;
-- Expect: 18 | 34989
-- SELECT COUNT(*), SUM(CASE WHEN dr_cr='DR' THEN amount ELSE 0 END), SUM(CASE WHEN dr_cr='CR' THEN amount ELSE 0 END), MAX(balance) FROM bank_transactions;
-- Expect: 59 | 79770.24 | 120342.00 | 40571.76
-- Book in-hand = 96220 - (28812+34989) = 32419
-- Bank - Book = 40571.76 - 32419 = +8152.76 (bridge: pre-bank +967, capital/personal +5168, cash sheet 1950+2009 + paise)
