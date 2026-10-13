-- BNI Maestros - Pune East Region (17 contacts) — run in Supabase SQL editor
-- Table: bni_contacts (from supabase-bni.sql)
-- Safe to re-run: skips existing emails for this meet.

INSERT INTO bni_contacts (name, company_name, email, phone, power_team, meet_name, status, notes)
SELECT * FROM (VALUES
  ('Amitkumar Deshpande', 'Corporate Lawyer - Avlegal Counsel', 'amit@avlegalcounsel.com', '9673998804', 1, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Corporate Lawyer'),
  ('Ali Asghar', 'Video Graphy - The Tall Guy Studio', 'thetallguystudio@gmail.com', '8104153525', 1, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Video Graphy'),
  ('Anilkumar Shimpi', 'General Insurance', 'anil.shimpl@gmail.com', '9595104617', 1, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - General Insurance'),
  ('Anis Shaikh', 'Interior Designer (Residential) - Inmax', 'inmax_id@yahoo.com', '9822257979', 2, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Interior Designer (Residential)'),
  ('Anshul Sharma', 'Education Services', 'anshulbsharma@gmail.com', '9822047796', 2, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Education Services'),
  ('Chetan Firodiya', 'Virtual CFO Accounting', 'chetanfirodiya@gmail.com', '9860772323', 2, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Virtual CFO Accounting'),
  ('Gaurav Ajotikar', 'Real Estate Consultant (Residential)', 'ajotikar@gmail.com', '9607712338', 3, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Real Estate Consultant'),
  ('Hasan Kothari', 'Architect (Residential) - AR Kitects', 'info.arkitects@gmail.com', '9730821348', 3, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Architect (Residential)'),
  ('Husain Rangwala', 'Dentist - Dr Husain', 'drhusainr@gmail.com', '8446382553', 3, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Dentist'),
  ('Jay Desai', 'Portfolio Management Services - Arje Investment', 'arjeinvestment@gmail.com', '9638381414', 4, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Portfolio Management Services'),
  ('Madhavi Shelar', 'Travel & Tourism - Traav Expert', 'madhavi@traavexpert.com', '7843081635', 4, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Travel & Tourism'),
  ('Nandan Gumaste', 'Mutual Funds', 'ngumaste1@yahoo.com', '9422010153', 4, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Mutual Funds'),
  ('Padmaja Naidu', 'Life Insurance', 'padmajatnaidu10@gmail.com', '7350809185', 5, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Life Insurance'),
  ('Prakash Ariyarajan', 'Events - Dream Factory Events', 'info@dreamfactoryevents.co', '8446611477', 5, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Events'),
  ('Prashantt Kulkarni', 'Numerologist', 'prashant2k1@gmail.com', '9769962646', 5, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Numerologist'),
  ('Rachana Deshpande', 'Digital Marketing - AR Consulting', 'rachana@arconsulting.co.in', '7020772578', 6, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Digital Marketing'),
  ('Shubham Barkade', 'Labor Law', 'shubhambarkade.ils@gmail.com', '8237665856', 6, 'BNI Maestros - Pune East', 'new', 'BNI Maestros Pune East - Labor Law')
) AS v(name, company_name, email, phone, power_team, meet_name, status, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM bni_contacts b
  WHERE lower(b.email) = lower(v.email)
  AND b.meet_name = v.meet_name
);
