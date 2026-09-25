-- ============================================================
-- FoundersHub - AXIS BANK STATEMENT SEED (AISECUREEDGE360 PVT LTD)
-- A/c 925020049305366 | 01/01/2026 - 25/09/2026 | 59 rows verified:
-- Total DR 79,770.24 / Total CR 1,20,342.00 / Closing 40,571.76
-- Run in Supabase SQL editor. Safe to re-run (upsert by sno).
-- Categories: capital | bank_fee | client_advance | service_expense |
--   company_expense | owner_transfer | personal | unclassified
-- Founder rules locked 25/09/2026:
--   #1+#6+#7 opening 50k trio EXCLUDED (dont count, in+out net)
--   #3+#4 Zaid/Naziya 2500 = shareholder capital
--   mistaken pairs excluded (net 0): 12/13, 20/21, 22/23, 28/29, 37/38, 40/41
--   #47+#59 Shoeb 220 pair cleared, #39 Suf 80 ignore
--   Vision locked mail-only 3297: Shail extras (#32,33,36) excluded pending FE
--   #48 Good Flippin, #49 Farooque 250, #56 Zaid 490, #57 Burger 440 = company expense
--   #58 Jyotirlinga 15k = DailyDripCafe (renamed Jitendra) website advance
-- sheet_ref: FE-01..17 = financial entry, CE-01..08 = company expense,
--   CE-NEW-01.. = bank-fee / confirmed company expenses, ? = needs confirmation
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sno integer NOT NULL UNIQUE,
  txn_date date NOT NULL,
  particulars text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  dr_cr text NOT NULL CHECK (dr_cr IN ('DR','CR')),
  balance numeric NOT NULL,
  category text NOT NULL DEFAULT 'unclassified',
  linked_client text,
  sheet_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_cat ON bank_transactions(category);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_transactions' AND policyname = 'Authenticated users can do everything on bank_transactions') THEN
    CREATE POLICY "Authenticated users can do everything on bank_transactions"
      ON bank_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END; $$;

INSERT INTO bank_transactions (sno, txn_date, particulars, amount, dr_cr, balance, category, linked_client, sheet_ref, notes)
VALUES
  (1, DATE '2026-03-12', 'CLG/000011/100326/Kotak Mahi/NAZIYA ZUBER SHIAKH', 50000.00, 'CR', 50000.00, 'capital', NULL, NULL, 'Opening capital via Kotak cheque 000011 - EXCLUDED per founder (offset by #6+#7)'),
  (2, DATE '2026-03-12', 'Dr Card Charges GST ISSUE 4632XXXXXXXX7179', 295.00, 'DR', 49705.00, 'bank_fee', NULL, 'CE-NEW-01', 'Debit card GST charges'),
  (3, DATE '2026-03-16', 'UPI/P2A/607516163417/ZAID ZUBE/KKBK/Business', 2500.00, 'CR', 52205.00, 'capital', NULL, NULL, 'Zaid shareholder capital (confirmed 25/09)'),
  (4, DATE '2026-03-16', 'UPI/P2A/607501086989/NAZIYA ZU/KKBK/Business', 2500.00, 'CR', 54705.00, 'capital', NULL, NULL, 'Naziya shareholder capital (confirmed 25/09)'),
  (5, DATE '2026-03-26', 'UPI/P2A/782691141968/SAYYEDANW/ICIC/Admin pa', 3000.00, 'CR', 57705.00, 'client_advance', 'CA Sayed', 'FE-05', 'Admin tab advance'),
  (6, DATE '2026-03-26', 'IMPS/P2A/608523823280/NAZIYA ZUBER SHAIKH/KOTAK', 10005.90, 'DR', 47699.10, 'capital', NULL, NULL, 'Opening transfer to own Kotak - EXCLUDED per founder'),
  (7, DATE '2026-03-30', 'IMPS/P2A/608937741079/NAZIYA ZUBER SHAIKH/KOTAK', 40005.90, 'DR', 7693.20, 'capital', NULL, NULL, 'Opening transfer to own Kotak - EXCLUDED per founder'),
  (8, DATE '2026-04-27', 'IMPS/P2A/611743924420/INAMDAR AND CO/HDFC', 1505.90, 'DR', 6187.30, 'company_expense', NULL, 'CE-04', 'Return Filing 1500 (bank 1505.90, diff 5.90)'),
  (9, DATE '2026-05-09', 'UPI/P2A/649540464598/MOHAMMED PASHA/Busine/SBI', 700.00, 'DR', 5487.30, 'company_expense', NULL, 'CE-03', 'Business meet 700 (confirmed)'),
  (10, DATE '2026-05-14', 'Monthly Service Chrgs APR/26', 100.00, 'DR', 5387.30, 'bank_fee', NULL, 'CE-NEW-02', 'Monthly service charges APR'),
  (11, DATE '2026-05-14', 'GST @18% on Monthly Service Chrgs', 18.00, 'DR', 5369.30, 'bank_fee', NULL, 'CE-NEW-02', 'GST on charges'),
  (12, DATE '2026-05-26', 'UPI/P2A/651317464229/TARANNUM/KKBK/UPI', 142.00, 'CR', 5511.30, 'personal', NULL, NULL, 'Tarannum pass-through in, excluded (offsets #13)'),
  (13, DATE '2026-05-27', 'UPI/P2A/651334553028/ZAID ZUBER SHAIKH/Kotak', 142.00, 'DR', 5369.30, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #12)'),
  (14, DATE '2026-06-02', 'UPI/P2A/557089489791/S S TRADE/BARB/Payment', 3800.00, 'CR', 9169.30, 'client_advance', 'Virtex Tech', 'FE-11', 'S S Trade payment = Virtex advance'),
  (15, DATE '2026-06-05', 'UPI/P2M/615619420954/Hostinger/AIRTEL PA/MANDATE', 1456.64, 'DR', 7712.66, 'service_expense', 'Virtex Tech', 'FE-11', 'Hostinger domains+mail (sheet 1456)'),
  (16, DATE '2026-06-09', 'NEFT/HDFCH01052728880/THOUGHTFUL HEARTS FOUNDATION/THF WebsiteDev40pc', 4799.00, 'CR', 12511.66, 'client_advance', 'Thoughtful Hearts', 'FE-13', 'WebsiteDev 40% (NEFT)'),
  (17, DATE '2026-06-09', 'UPI/P2A/074628391349/INAMDAR/HDFC/Ucci adv', 5000.00, 'CR', 17511.66, 'client_advance', 'UCCI', 'FE-09', 'UCCI advance via Inamdar'),
  (18, DATE '2026-06-16', 'Monthly Service Chrgs MAY/26', 100.00, 'DR', 17411.66, 'bank_fee', NULL, 'CE-NEW-03', 'Monthly charges MAY'),
  (19, DATE '2026-06-16', 'GST @18% on Monthly Service Chrgs', 18.00, 'DR', 17393.66, 'bank_fee', NULL, 'CE-NEW-03', 'GST on charges'),
  (20, DATE '2026-06-28', 'UPI/P2A/125411655126/RISHAB VI/KKBK/UPI', 300.00, 'CR', 17693.66, 'personal', NULL, NULL, 'Rishab pass-through in, excluded (offsets #21)'),
  (21, DATE '2026-06-28', 'UPI/P2A/654507850033/ZAID ZUBER SHAIKH/Kotak', 300.00, 'DR', 17393.66, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #20)'),
  (22, DATE '2026-06-30', 'UPI/P2A/654720106335/RISHAB VI/KKBK/UPI', 200.00, 'CR', 17593.66, 'personal', NULL, NULL, 'Rishab pass-through in, excluded (offsets #23)'),
  (23, DATE '2026-06-30', 'UPI/P2A/654709824660/ZAID ZUBER SHAIKH/Kotak', 200.00, 'DR', 17393.66, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #22)'),
  (24, DATE '2026-07-08', 'UPI/P2M/655510559784/Godaddy/Pay/HDFC BANK LTD', 552.24, 'DR', 16841.42, 'service_expense', 'BM Industries', 'FE-06', 'GoDaddy mailbox (sheet 552)'),
  (25, DATE '2026-07-09', 'UPI/P2A/214482457866/BM INDUST/SBIN/For MAIL', 1500.00, 'CR', 18341.42, 'client_advance', 'BM Industries', 'FE-06', 'For MAIL'),
  (26, DATE '2026-07-16', 'GST @18% on Monthly Service Chrgs', 18.00, 'DR', 18323.42, 'bank_fee', NULL, 'CE-NEW-04', 'GST (June charges billed Jul)'),
  (27, DATE '2026-07-16', 'Monthly Service Chrgs JUN/26', 100.00, 'DR', 18223.42, 'bank_fee', NULL, 'CE-NEW-04', 'Monthly charges JUN'),
  (28, DATE '2026-07-25', 'UPI/P2A/620678844700/Mr Md Suf/MAHB/UPI', 9.00, 'CR', 18232.42, 'personal', NULL, NULL, 'Md Suf 9 pass-through in, ignored (offsets #29)'),
  (29, DATE '2026-07-25', 'UPI/P2A/657290009163/ZAID ZUBER SHAIKH/Kotak', 9.00, 'DR', 18223.42, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #28)'),
  (30, DATE '2026-08-01', 'UPI/P2A/623530199026/Mr Shail/IDFB/Pay requ', 3297.00, 'CR', 21520.42, 'client_advance', 'Vision Surgical', 'FE-15', 'Vision mail-only locked 3297 (bank 3297 vs sheet adv 3296, Re 1)'),
  (31, DATE '2026-08-01', 'UPI/P2M/621321662662/Hostinger/AIRTEL PA/MANDATE', 647.82, 'DR', 20872.60, 'service_expense', 'Vision Surgical', 'FE-15', 'Hostinger 1/3 (Vision total 2318.62 vs sheet 2317)'),
  (32, DATE '2026-08-02', 'UPI/P2A/658044733867/Shailesh Bharat Tiwar/IDFC', 500.00, 'DR', 20372.60, 'personal', NULL, NULL, 'Shailesh 500 EXCLUDED: Vision locked mail-only 3297, pending FE decision'),
  (33, DATE '2026-08-02', 'UPI/P2A/621469723252/Mr Shail/IDFB/Pay requ', 300.00, 'CR', 20672.60, 'personal', NULL, NULL, 'Shail 300 EXCLUDED: Vision locked mail-only, pending confirm'),
  (34, DATE '2026-08-02', 'UPI/P2M/110345277501/HOSTINGER/ICICI/Pay via', 835.44, 'DR', 19837.16, 'service_expense', 'Vision Surgical', 'FE-15', 'Hostinger 2/3'),
  (35, DATE '2026-08-02', 'UPI/P2M/621413935535/Hostinger/AIRTEL PA/MANDATE', 835.36, 'DR', 19001.80, 'service_expense', 'Vision Surgical', 'FE-15', 'Hostinger 3/3'),
  (36, DATE '2026-08-02', 'UPI/P2A/621469877902/Mr Shail/IDFB/Pay requ', 300.00, 'CR', 19301.80, 'personal', NULL, NULL, 'Shail 300 EXCLUDED: Vision locked mail-only, pending confirm'),
  (37, DATE '2026-08-09', 'UPI/P2A/127625700121/SADIYA AB/IOBA/UPI', 245.00, 'CR', 19546.80, 'personal', NULL, NULL, 'Sadiya pass-through in, excluded (offsets #38)'),
  (38, DATE '2026-08-10', 'UPI/P2A/622296028775/ZAID ZUBER SHAIKH/Kotak', 245.00, 'DR', 19301.80, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #37)'),
  (39, DATE '2026-08-12', 'UPI/P2A/127786321974/Mr Md Suf/MAHB/UPI', 80.00, 'CR', 19381.80, 'personal', NULL, NULL, 'Md Suf 80 ignored per founder'),
  (40, DATE '2026-08-14', 'UPI/P2A/622697591916/Mr Shail/IDFB/Pay requ', 125.00, 'CR', 19506.80, 'personal', NULL, NULL, 'Shail 125 pass-through in, excluded (offsets #41)'),
  (41, DATE '2026-08-15', 'UPI/P2A/622737281617/Shailesh Bharat Tiwar/IDFC', 125.00, 'DR', 19381.80, 'personal', NULL, NULL, 'Pass-through out, excluded (offsets #40)'),
  (42, DATE '2026-08-21', 'Monthly Service Chrgs JUL/26', 100.00, 'DR', 19281.80, 'bank_fee', NULL, 'CE-NEW-05', 'Monthly charges JUL'),
  (43, DATE '2026-08-21', 'GST @18% on Monthly Service Chrgs', 18.00, 'DR', 19263.80, 'bank_fee', NULL, 'CE-NEW-05', 'GST on charges'),
  (44, DATE '2026-08-23', 'UPI/P2A/623530199026/Akbar Bai/NESF/UPI', 7400.00, 'CR', 26663.80, 'client_advance', 'PEES Tee group', 'FE-14', 'Akbar Bai = PEES advance'),
  (45, DATE '2026-09-03', 'NEFT/HDFCH01233813502/MUKHTAR AHMED RAZZAK SHAIKH/adv pay aed 2k', 19625.00, 'CR', 46288.80, 'client_advance', 'Al Barkah', 'FE-16', 'Advance pay (NEFT)'),
  (46, DATE '2026-09-03', 'UPI/P2M/624619139323/Hostinger/AIRTEL PA/MANDATE', 1610.04, 'DR', 44678.76, 'service_expense', 'Al Barkah', 'FE-16', 'Hostinger (sheet 1610)'),
  (47, DATE '2026-09-03', 'UPI/P2A/624691097227/DR SHOEB/PUNB/UPI', 220.00, 'CR', 44898.76, 'personal', NULL, NULL, 'Dr Shoeb 220 in - CLEARED by #59 out, net 0'),
  (48, DATE '2026-09-03', 'UPI/P2M/624657765548/GOOD FLIPPIN BURGERS/HDFC', 1759.00, 'DR', 43139.76, 'company_expense', NULL, 'CE-NEW-07', 'Good Flippin Burgers - business food (confirmed)'),
  (49, DATE '2026-09-03', 'UPI/P2A/624675674395/Mr FAROOQUE MANJUR SH/BOM', 250.00, 'DR', 42889.76, 'company_expense', NULL, 'CE-NEW-08', 'Farooque 250 (confirmed company expense)'),
  (50, DATE '2026-09-04', 'UPI/P2A/661376307791/UNITED CHAMBER OF COM/Cosmos', 450.00, 'DR', 42439.76, 'company_expense', NULL, 'CE-07', 'United Chamber business meet'),
  (51, DATE '2026-09-04', 'UPI/P2A/661306119487/Mr FAROOQUE MANJUR SH/BOM', 10000.00, 'DR', 32439.76, 'service_expense', 'PEES Tee group', 'FE-14', '10k to Farooquee bhai (subcontract, 12k total)'),
  (52, DATE '2026-09-09', 'UPI/P2A/625292564611/Mr FAROOQUE MANJUR SH/BOM', 2000.00, 'DR', 30439.76, 'service_expense', 'PEES Tee group', 'FE-14', 'Farooque 2000 - PEES 12k total (confirmed)'),
  (53, DATE '2026-09-11', 'UPI/P2A/625418037763/DADA B BHAPKAR/SARASWAT BANK', 3600.00, 'DR', 26839.76, 'company_expense', NULL, 'CE-08', 'BNI Akurdi meet (900 x 4), paid via Dada Bhapkar - confirmed'),
  (54, DATE '2026-09-18', 'Monthly Service Chrgs AUG/26', 100.00, 'DR', 26739.76, 'bank_fee', NULL, 'CE-NEW-06', 'Monthly charges AUG'),
  (55, DATE '2026-09-18', 'GST @18% on Monthly Service Chrgs', 18.00, 'DR', 26721.76, 'bank_fee', NULL, 'CE-NEW-06', 'GST on charges'),
  (56, DATE '2026-09-20', 'UPI/P2A/626319255441/ZAID ZUBER SHAIKH/Kotak', 490.00, 'DR', 26231.76, 'company_expense', NULL, 'CE-NEW-09', 'Zaid 490 (confirmed company expense)'),
  (57, DATE '2026-09-21', 'UPI/P2M/663066332752/Burger/UPI/YES BANK LIMITED YBS', 440.00, 'DR', 25791.76, 'company_expense', NULL, 'CE-NEW-10', 'Burger 440 (confirmed company expense)'),
  (58, DATE '2026-09-25', 'INB/IFT/12 JYOTIRLINGA HOSPITALITY PRIVATE LIMITE', 15000.00, 'CR', 40791.76, 'client_advance', 'DailyDripCafe', 'FE-17', 'Daily Drip website upfront (Option A 15k, quotation 01/08/26)'),
  (59, DATE '2026-09-25', 'UPI/P2A/663410002537/ZAID ZUBER SHAIKH/Dr sho/Kotak', 220.00, 'DR', 40571.76, 'personal', NULL, NULL, 'Dr Shoeb 220 returned - clears #47, net 0')
ON CONFLICT (sno) DO UPDATE SET txn_date = EXCLUDED.txn_date, particulars = EXCLUDED.particulars, amount = EXCLUDED.amount, dr_cr = EXCLUDED.dr_cr, balance = EXCLUDED.balance, category = EXCLUDED.category, linked_client = EXCLUDED.linked_client, sheet_ref = EXCLUDED.sheet_ref, notes = EXCLUDED.notes;

-- Verification (matches printed statement 25/09):
-- SELECT COUNT(*), SUM(CASE WHEN dr_cr='DR' THEN amount ELSE 0 END) AS total_dr, SUM(CASE WHEN dr_cr='CR' THEN amount ELSE 0 END) AS total_cr, MAX(balance) AS closing FROM bank_transactions;
-- Expect: 59 | 79770.24 | 120342.00 | 40571.76
