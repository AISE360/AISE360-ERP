-- ============================================================
-- Follow-Ups: Virtex expiries (from Hostinger screenshots) +
-- 30-day reminder rule for ALL maintenance follow-ups.
-- Run AFTER supabase-followups-mail.sql
-- ============================================================

-- 1. Virtex Tech client email fix (real mailbox from screenshot)
update clients
set email = 'info@virtexit.com'
where id = '11111111-0001-0001-0001-000000000007';

do $$
declare founder_id uuid;
declare virtex_project uuid := '22222222-0001-0001-0001-000000000007';
begin
  select id into founder_id from profiles where is_active = true limit 1;
  if founder_id is null then select id into founder_id from profiles limit 1; end if;
  if founder_id is null then return; end if;

  -- remove any old virtex maintenance dupes, insert fresh with expiry_date
  delete from follow_ups where project_id = virtex_project and type = 'maintenance';

  insert into follow_ups (project_id, title, description, due_date, expiry_date, client_name, client_email, assigned_to, is_done, type, auto_remind)
  values
    (virtex_project,
     'Virtex Tech – Mail Renewal (info@virtexit.com)',
     'Starter Business Email, info@virtexit.com. Renew before expiry.',
     '2027-05-06', '2027-06-05', 'Virtex Tech', 'info@virtexit.com', founder_id, false, 'maintenance', true),
    (virtex_project,
     'Virtex Tech – Domain Renewal (virtexit.com)',
     'Domain virtexit.com. Renew before expiry.',
     '2027-06-06', '2027-07-06', 'Virtex Tech', 'info@virtexit.com', founder_id, false, 'maintenance', true);
end $$;

-- 2. Enforce 30-day rule: reminder (due_date) = expiry - 30 for all maintenance
update follow_ups
set due_date = (expiry_date - interval '30 days')::date
where type = 'maintenance'
  and expiry_date is not null
  and is_done = false;

-- 3. Backfill client emails where still missing (project -> client)
update follow_ups f
set client_email = c.email,
    client_name = coalesce(f.client_name, c.contact_person)
from projects p
join clients c on c.id = p.client_id
where f.project_id = p.id
  and (f.client_email is null or f.client_email = '')
  and c.email is not null
  and c.email not like '%@client.com'
  and c.email not like '%networking.local';
