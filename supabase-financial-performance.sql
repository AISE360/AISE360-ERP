-- ============================================================
-- FoundersHub — FINANCIAL PERFORMANCE SYSTEM MIGRATION & SEED
-- Run this in your Supabase SQL editor
-- Exact match with your Financial Performance Excel Spreadsheet
-- ------------------------------------------------------------
-- ⚠ WARNING (Sep 2026): the live database now contains MANUAL
-- corrections (PEES 12k, DailyDripCafe rename + 15k website, BNI Akurdi,
-- Aug fees, Good Flippin/Farooque/Zaid/Burger expenses, re-dated entries).
-- Do NOT re-run sections 4–6 wholesale — the upserts would
-- overwrite those corrections. For surgical changes use
-- supabase-fix-finance-2026-09-25.sql instead.
-- Section 0 (projects alignment) is safe to re-run any time.
-- ============================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 0. PROJECTS TABLE ALIGNMENT (safe to re-run)
-- The app reads projects(name, client_id, status, budget, ...)
-- but older databases only have (id, title, description, ...).
-- Add the missing columns and backfill name from title.
-- ─────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS upfront_received numeric NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE projects
SET name = COALESCE(NULLIF(title, ''), 'Untitled Project')
WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ─────────────────────────────────────────
-- 1. FINANCIAL ENTRIES TABLE
-- Billable service line-items per client/project
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_amount numeric NOT NULL DEFAULT 0 CHECK (expense_amount >= 0),
  charged_amount numeric NOT NULL DEFAULT 0 CHECK (charged_amount >= 0),
  advance_amount numeric NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  balance_amount numeric GENERATED ALWAYS AS (charged_amount - advance_amount) STORED,
  profit_amount numeric GENERATED ALWAYS AS (charged_amount - expense_amount) STORED,
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_client ON financial_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_project ON financial_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON financial_entries(entry_date);

-- ─────────────────────────────────────────
-- 2. COMPANY EXPENSES TABLE
-- General business overheads (distinct from direct service delivery costs)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_date ON company_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_category ON company_expenses(category);

-- ─────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_entries' AND policyname = 'Authenticated users can do everything on financial_entries'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on financial_entries"
      ON financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_expenses' AND policyname = 'Authenticated users can do everything on company_expenses'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on company_expenses"
      ON company_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- ─────────────────────────────────────────
-- 4. ENSURE ALL CLIENTS FROM SPREADSHEET EXIST
-- ─────────────────────────────────────────
INSERT INTO clients (id, company_name, contact_person, phone, email, notes)
VALUES
  ('11111111-0001-0001-0001-000000000001', 'DailyDripCafe',            'Jitendra',         '0000000001', 'info@dailydripcafe.shop',   'Renamed 25/09/26: holder of 8 domains + 8 mailboxes (incl dailydripcafe) | Website: Daily Drip Cafe'),
  ('11111111-0001-0001-0001-000000000002', 'Eleora',                   'Eleora',            '0000000002', 'eleora@client.com',             'Service: Website'),
  ('11111111-0001-0001-0001-000000000003', 'CA Sayed',                 'CA Sayed',          '0000000003', 'casayed@client.com',            'Service: Website + Admin tab'),
  ('11111111-0001-0001-0001-000000000004', 'BM Industries',            'BM Industries',     '0000000004', 'contact@bmmayurindustries.com', 'Mailbox: contact@bmmayurindustries.com'),
  ('11111111-0001-0001-0001-000000000005', 'KL Latifix',               'KL Latifix',        '0000000005', 'sales@kllatifix.com',           'Domain: kllatifix.com'),
  ('11111111-0001-0001-0001-000000000006', 'UCCI',                     'UCCI',              '0000000006', 'info@ucciindia.org',            'Domain: ucciindia.org'),
  ('11111111-0001-0001-0001-000000000007', 'Virtex Tech',              'Virtex Tech',       '0000000007', 'virtextech@client.com',         'Service: Website'),
  ('11111111-0001-0001-0001-000000000009', 'Vision Surgical Solutions','Vision Surgical',   '0000000009', 'info@vissol.in',                'Domain: vissol.in'),
  ('11111111-0001-0001-0001-000000000010', 'MBC main',                 'MBC main',          '0000000010', 'mbc@client.com',                'Service: Website'),
  ('11111111-0001-0001-0001-000000000011', 'Thoughtful Hearts',        'Thoughtful Hearts', '0000000011', 'hearts@client.com',             'Service: Website'),
  ('11111111-0001-0001-0001-000000000012', 'PEES Tee group',           'PEES Tee group',    '0000000012', 'peestee@client.com',            'Service: Website'),
  ('11111111-0001-0001-0001-000000000013', 'Al Barkah',                'Al Barkah',         '0000000013', 'albarkah@client.com',           'Service: Website')
ON CONFLICT (id) DO UPDATE
  SET company_name = EXCLUDED.company_name;

-- ─────────────────────────────────────────
-- 5. SEED ALL 16 SPREADSHEET FINANCIAL ENTRIES
-- ─────────────────────────────────────────
DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;
  IF founder_id IS NULL THEN
    SELECT id INTO founder_id FROM profiles LIMIT 1;
  END IF;

  -- Ensure every project referenced by the entries below exists,
  -- so this script runs standalone (without seed-data.sql).
  INSERT INTO projects (id, name, description, client_id, status, priority, budget, upfront_received, created_by)
  VALUES
    ('22222222-0001-0001-0001-000000000001', 'Jitendra – Domains', '8 Domains | Budget: ₹6900 | Received: ₹6900', '11111111-0001-0001-0001-000000000001', 'completed', 'medium', 6900, 6900, founder_id),
    ('22222222-0001-0001-0001-000000000002', 'Eleora – Website', 'Website | Budget: ₹10000 | Received: ₹2000', '11111111-0001-0001-0001-000000000002', 'active', 'medium', 10000, 2000, founder_id),
    ('22222222-0001-0001-0001-000000000003', 'CA Sayed – Website', '1 Domain + Website & Hosting | Budget: ₹7000 | Received: ₹7000', '11111111-0001-0001-0001-000000000003', 'completed', 'medium', 7000, 7000, founder_id),
    ('22222222-0001-0001-0001-000000000004', 'BM Industries – Mailbox', 'Mailbox creation | Budget: ₹1500 | Received: ₹1500', '11111111-0001-0001-0001-000000000004', 'completed', 'medium', 1500, 1500, founder_id),
    ('22222222-0001-0001-0001-000000000005', 'KL Latifix – Website & Domain', 'Domain and mail purchased | Budget: ₹14000 | Received: ₹10000', '11111111-0001-0001-0001-000000000005', 'completed', 'medium', 14000, 10000, founder_id),
    ('22222222-0001-0001-0001-000000000006', 'UCCI – Website', 'Website development | Budget: ₹11000 | Received: ₹5000', '11111111-0001-0001-0001-000000000006', 'active', 'medium', 11000, 5000, founder_id),
    ('22222222-0001-0001-0001-000000000007', 'Virtex Tech – Website', 'Website development | Budget: ₹9500 | Received: ₹3800', '11111111-0001-0001-0001-000000000007', 'active', 'medium', 9500, 3800, founder_id),
    ('22222222-0001-0001-0001-000000000009', 'Vision Surgical Solutions – Domain & Mail', 'Domain: vissol.in | Budget: ₹3297 | Received: ₹3296', '11111111-0001-0001-0001-000000000009', 'completed', 'medium', 3297, 3296, founder_id),
    ('22222222-0001-0001-0001-000000000010', 'CA Sayed – Admin Tab', 'Admin tab module | Budget: ₹3000 | Received: ₹3000', '11111111-0001-0001-0001-000000000003', 'completed', 'medium', 3000, 3000, founder_id),
    ('22222222-0001-0001-0001-000000000011', 'KL Latifix – Business Mail', 'Business mail setup', '11111111-0001-0001-0001-000000000005', 'completed', 'medium', 0, 0, founder_id),
    ('22222222-0001-0001-0001-000000000012', 'UCCI – Admin Tab', 'Admin tab module | Budget: ₹700 | Received: ₹0', '11111111-0001-0001-0001-000000000006', 'active', 'medium', 700, 0, founder_id)
  ON CONFLICT (id) DO NOTHING;

  -- Upsert all 16 entries from the Excel spreadsheet
  INSERT INTO financial_entries (
    id, client_id, project_id, service_name, entry_date, expense_amount, charged_amount, advance_amount, remarks, created_by
  )
  VALUES
    -- 1. Jitendra — Domains (Expenses: 3754, Charged: 6900, Advance: 6900, Balance: 0, Profit: 3146)
    ('33333333-0001-0001-0001-000000000001',
     '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
      'Domains', DATE '2026-01-15', 3754, 6900, 6900, '8 Domains created', founder_id),

    -- 2. Jitendra — Mails (Expenses: 4416, Charged: 6900, Advance: 6900, Balance: 0, Profit: 2484)
    ('33333333-0001-0001-0001-000000000002',
     '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
      'Mails', DATE '2026-02-10', 4416, 6900, 6900, '8 Mailbox created', founder_id),

    -- 3. Eleora — Website (Expenses: 0, Charged: 10000, Advance: 2000, Balance: 8000, Profit: 10000)
    ('33333333-0001-0001-0001-000000000003',
     '11111111-0001-0001-0001-000000000002', '22222222-0001-0001-0001-000000000002',
      'Website', DATE '2026-02-20', 0, 10000, 2000, NULL, founder_id),

    -- 4. CA Sayed — Website (Expenses: 1308, Charged: 7000, Advance: 7000, Balance: 0, Profit: 5692)
    ('33333333-0001-0001-0001-000000000004',
     '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000003',
      'Website', DATE '2026-02-28', 1308, 7000, 7000, '1 Domain + Website & Hosting', founder_id),

    -- 5. CA Sayed — Admin tab (Expenses: 0, Charged: 3000, Advance: 3000, Balance: 0, Profit: 3000)
    ('33333333-0001-0001-0001-000000000005',
     '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000010',
      'Admin tab', DATE '2026-03-26', 0, 3000, 3000, 'Axis #5: Admin payment received', founder_id),

    -- 6. BM Industries — Mailbox (Expenses: 552, Charged: 1500, Advance: 1500, Balance: 0, Profit: 948)
    ('33333333-0001-0001-0001-000000000006',
     '11111111-0001-0001-0001-000000000004', '22222222-0001-0001-0001-000000000004',
      'Mailbox', DATE '2026-07-09', 552, 1500, 1500, 'Mailbox creation (Axis #24-25)', founder_id),

    -- 7. KL Latifix — Website,Domain (Expenses: 904, Charged: 14000, Advance: 10000, Balance: 4000, Profit: 13096)
    ('33333333-0001-0001-0001-000000000007',
     '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000005',
      'Website,Domain', DATE '2026-03-05', 904, 14000, 10000, 'Domain anad mail purchased', founder_id),

    -- 8. KL Latifix — Bussiness Mail (Expenses: 495, Charged: 0, Advance: 0, Balance: 0, Profit: -495)
    ('33333333-0001-0001-0001-000000000008',
     '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000011',
      'Bussiness Mail', DATE '2026-03-08', 495, 0, 0, NULL, founder_id),

    -- 9. UCCI — Website (Expenses: 0, Charged: 11000, Advance: 5000, Balance: 6000, Profit: 11000)
    ('33333333-0001-0001-0001-000000000009',
     '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000006',
      'Website', DATE '2026-06-09', 0, 11000, 5000, 'Axis #17: UCCI advance', founder_id),

    -- 10. UCCI — Admin tab (Expenses: 0, Charged: 700, Advance: 0, Balance: 700, Profit: 700)
    ('33333333-0001-0001-0001-000000000010',
     '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000012',
      'Admin tab', DATE '2026-06-20', 0, 700, 0, 'Date approx - confirm', founder_id),

    -- 11. Virtex Tech — Website (Expenses: 1456, Charged: 9500, Advance: 3800, Balance: 5700, Profit: 8044)
    ('33333333-0001-0001-0001-000000000011',
     '11111111-0001-0001-0001-000000000007', '22222222-0001-0001-0001-000000000007',
      'Website', DATE '2026-06-02', 1456, 9500, 3800, 'Domain,mail purchased 5/06/26 (Axis #14-15)', founder_id),

    -- 12. MBC main — website (Expenses: 0, Charged: 7500, Advance: 0, Balance: 7500, Profit: 7500)
    ('33333333-0001-0001-0001-000000000012',
     '11111111-0001-0001-0001-000000000010', NULL,
      'website', DATE '2026-07-15', 0, 7500, 0, 'Date approx (no payment received yet) - confirm', founder_id),

    -- 13. Thoughtful Hearts — Website (Expenses: 0, Charged: 11998, Advance: 4799, Balance: 7199, Profit: 11998)
    ('33333333-0001-0001-0001-000000000013',
     '11111111-0001-0001-0001-000000000011', NULL,
      'Website', DATE '2026-06-09', 0, 11998, 4799, 'Axis #16: WebsiteDev 40% (NEFT)', founder_id),

    -- 14. PEES Tee group — Website (Expenses: 12000, Charged: 18500, Advance: 7400, Balance: 11100, Profit: 6500)
    ('33333333-0001-0001-0001-000000000014',
     '11111111-0001-0001-0001-000000000012', NULL,
      'Website', DATE '2026-08-23', 12000, 18500, 7400, '12k given to Farooque bhai (Axis #44, #51 10k + #52 2k)', founder_id),

    -- 15. Vision Surgical — Domain,mail (Expenses: 2317, Charged: 3297, Advance: 3296, Balance: 1, Profit: 980)
    ('33333333-0001-0001-0001-000000000015',
     '11111111-0001-0001-0001-000000000009', '22222222-0001-0001-0001-000000000009',
      'Domain,mail', DATE '2026-08-01', 2317, 3297, 3296, 'Axis #30-36: 3x Hostinger 2318.62, adv 3297 (Re 1 pending)', founder_id),

    -- 16. Al Barkah — Website (Expenses: 1610, Charged: 49000, Advance: 19625, Balance: 29375, Profit: 47390)
    ('33333333-0001-0001-0001-000000000016',
     '11111111-0001-0001-0001-000000000013', NULL,
      'Website', DATE '2026-09-03', 1610, 49000, 19625, 'Axis #45-46: NEFT advance + Hostinger', founder_id),

    -- 17. DailyDripCafe — Website (Expenses: 0, Charged: 15000, Advance: 15000, Balance: 0, Profit: 15000)
    ('33333333-0001-0001-0001-000000000017',
     '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000014',
      'Website', DATE '2026-09-25', 0, 15000, 15000, 'Daily Drip Cafe website upfront Option A - Axis #58 Jyotirlinga 15k', founder_id)

  ON CONFLICT (id) DO UPDATE
    SET client_id      = EXCLUDED.client_id,
        project_id     = EXCLUDED.project_id,
        service_name   = EXCLUDED.service_name,
        expense_amount = EXCLUDED.expense_amount,
        charged_amount = EXCLUDED.charged_amount,
        advance_amount = EXCLUDED.advance_amount,
        remarks        = EXCLUDED.remarks;

  -- ─────────────────────────────────────────
  -- 6. SEED COMPANY EXPENSES (7 sheet rows + 5 Axis bank-fee rows)
  -- Dates before 12/03/2026 = paid pre-bank-account (cash).
  -- ─────────────────────────────────────────
  INSERT INTO company_expenses (id, expense_date, category, description, amount, remarks, created_by)
  VALUES
    -- 1. Domain and mailbox (1456) — pre-bank-account purchase, no Axis trace
    ('44444444-0001-0001-0001-000000000001', DATE '2026-02-15', 'Domain', 'Domain and mailbox', 1456, 'Paid pre-bank-account (no Axis trace) - confirm', founder_id),

    -- 2. Bussiness meet (1950) — cash, no Axis trace
    ('44444444-0001-0001-0001-000000000002', DATE '2026-04-10', 'Business Meeting', 'Bussiness meet', 1950, 'Paid in cash, date approx (no Axis trace) - confirm', founder_id),

    -- 3. Bussiness meet (700) — TENTATIVE: Axis #9 Mohammed Pasha Business 700
    ('44444444-0001-0001-0001-000000000003', DATE '2026-05-09', 'Business Meeting', 'Bussiness meet', 700, 'TENTATIVE: Axis #9 Mohammed Pasha 700 - confirm', founder_id),

    -- 4. Return Filing (1500) — TENTATIVE: Axis #8 Inamdar 1505.90
    ('44444444-0001-0001-0001-000000000004', DATE '2026-04-27', 'Return Filing', 'Return Filing', 1500, 'TENTATIVE: Axis #8 Inamdar and Co 1505.90 - confirm', founder_id),

    -- 5. CA charges (19500) — pre-bank-account/cash, no Axis trace
    ('44444444-0001-0001-0001-000000000005', DATE '2026-02-20', 'CA Charges', 'CA charges', 19500, 'Paid pre-bank-account/cash (no Axis trace) - confirm', founder_id),

    -- 6. Food travel (2009) — cash, date approx
    ('44444444-0001-0001-0001-000000000006', DATE '2026-08-15', 'Food/Travel', 'Food travel', 2009, 'Date approx (no Axis trace) - confirm', founder_id),

    -- 7. Bussiness meet (450) — Axis #50 United Chamber
    ('44444444-0001-0001-0001-000000000007', DATE '2026-09-04', 'Business Meeting', 'Bussiness meet', 450, 'Axis #50 United Chamber of Commerce', founder_id),

    -- 8. Bank Charges: debit card GST (Axis #2)
    ('44444444-0001-0001-0001-000000000008', DATE '2026-03-12', 'Bank Charges', 'Debit card charges + GST', 295, 'Axis #2', founder_id),

    -- 9. Bank Charges: Apr monthly + GST (Axis #10-11)
    ('44444444-0001-0001-0001-000000000009', DATE '2026-05-14', 'Bank Charges', 'Monthly service charges APR + GST', 118, 'Axis #10-11', founder_id),

    -- 10. Bank Charges: May monthly + GST (Axis #18-19)
    ('44444444-0001-0001-0001-000000000010', DATE '2026-06-16', 'Bank Charges', 'Monthly service charges MAY + GST', 118, 'Axis #18-19', founder_id),

    -- 11. Bank Charges: Jun monthly + GST (Axis #26-27)
    ('44444444-0001-0001-0001-000000000011', DATE '2026-07-16', 'Bank Charges', 'Monthly service charges JUN + GST', 118, 'Axis #26-27', founder_id),

    -- 12. Bank Charges: Jul monthly + GST (Axis #42-43)
    ('44444444-0001-0001-0001-000000000012', DATE '2026-08-21', 'Bank Charges', 'Monthly service charges JUL + GST', 118, 'Axis #42-43', founder_id),

    -- 13. BNI Akurdi meet via Dada Bhapkar (Axis #53)
    ('44444444-0001-0001-0001-000000000013', DATE '2026-09-11', 'Business Meeting', 'BNI Akurdi meet (900 x 4) via Dada Bhapkar', 3600, 'Axis #53 - confirmed', founder_id),

    -- 14. Bank Charges: Aug monthly + GST (Axis #54-55)
    ('44444444-0001-0001-0001-000000000014', DATE '2026-09-18', 'Bank Charges', 'Monthly service charges AUG + GST', 118, 'Axis #54-55', founder_id),

    -- 15-18. Confirmed 25/09: Good Flippin, Farooque 250, Zaid 490, Burger 440
    ('44444444-0001-0001-0001-000000000015', DATE '2026-09-03', 'Food/Travel', 'Good Flippin Burgers - business food', 1759, 'Axis #48 - confirmed', founder_id),
    ('44444444-0001-0001-0001-000000000016', DATE '2026-09-03', 'Miscellaneous', 'Farooque 250', 250, 'Axis #49 - confirmed', founder_id),
    ('44444444-0001-0001-0001-000000000017', DATE '2026-09-20', 'Miscellaneous', 'Zaid transfer 490', 490, 'Axis #56 - confirmed', founder_id),
    ('44444444-0001-0001-0001-000000000018', DATE '2026-09-21', 'Food/Travel', 'Burger 440', 440, 'Axis #57 - confirmed', founder_id)

  ON CONFLICT (id) DO UPDATE
    SET category    = EXCLUDED.category,
        description = EXCLUDED.description,
        amount      = EXCLUDED.amount,
        remarks     = EXCLUDED.remarks;

END;
$$;

-- ─────────────────────────────────────────
-- SUMMARY VERIFICATION (matches Spreadsheet + Axis statement 25/09/26)
-- ─────────────────────────────────────────
-- Total Charged  : ₹1,75,795 (160795 + DailyDrip 15000)
-- Total Advance  : ₹96,220   (81220 + DailyDrip 15000)
-- Total Balance  : ₹79,575   (175795 - 96220)
-- Service Expense: ₹28,812   (26812 + PEES +2000; Vision locked 2317)
-- Company Expense: ₹34,989   (28332 + BNI 3600 + Aug 118 + 1759 + 250 + 490 + 440)
-- Total Expense  : ₹63,801
-- Gross Profit   : ₹1,46,983 (Charged - Service Expense)
-- Net Profit     : ₹1,11,994 (Gross - Company Expense)
-- Book In-Hand   : ₹32,419   (Advance - Total Expense)
--
-- BANK BRIDGE (Book 32,419 -> Axis closing 40,571.76, diff +8,152.76):
--   +967.00  pre-bank net (frozen Jan-11Mar history)
--   +5,168   capital/personal net (shareholder 5000 + pass-through singles +180,
--            opening 50k trio net -11.80 included but flagged EXCLUDED)
--   +3,951   cash sheet costs with no Axis trace (Business meet 1950 + Food travel 2009)
--            + paise/tentative deltas (+1 Vision adv, +1.62 Vision svc, +0.04 Al Barkah, +5.90 Return Filing)
--   = 40,571.76 (Vision mail-only locked 3297/3296/2317; Shail extras excluded)
-- Full line-by-line map: supabase-bank-statement.sql (59 rows)
-- Live apply: supabase-fix-finance-2026-09-25.sql
-- ─────────────────────────────────────────
