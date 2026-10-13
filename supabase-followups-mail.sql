-- ============================================================
-- Follow-Ups upgrade: separate expiry date + client mailing
-- Run in Supabase SQL editor (safe to re-run)
-- ============================================================

-- 1. New columns on follow_ups
alter table follow_ups add column if not exists expiry_date date;
alter table follow_ups add column if not exists client_email text;
alter table follow_ups add column if not exists client_name text;
alter table follow_ups add column if not exists auto_remind boolean not null default true;
alter table follow_ups add column if not exists last_reminded_at timestamptz;
alter table follow_ups add column if not exists remind_count integer not null default 0;

create index if not exists idx_followups_expiry on follow_ups(expiry_date);
create index if not exists idx_followups_due on follow_ups(due_date);
create index if not exists idx_followups_type on follow_ups(type);
create index if not exists idx_followups_autoremind on follow_ups(auto_remind, is_done, due_date);

-- 2. Backfill expiry_date from description text like "expires 17/11/2026" / "expires 2026-12-19"
--    (only where expiry_date is still null, so manual edits are never overwritten)
do $$
declare r record;
declare m text;
declare d date;
begin
  for r in select id, description from follow_ups where expiry_date is null and description is not null loop
    m := substring(r.description from 'expires\s+(\d{2}/\d{2}/\d{4})');
    if m is not null then
      begin
        d := to_date(m, 'DD/MM/YYYY');
        update follow_ups set expiry_date = d where id = r.id;
        continue;
      exception when others then null;
      end;
    end if;
    m := substring(r.description from 'expires\s+(\d{4}-\d{2}-\d{2})');
    if m is not null then
      begin
        d := to_date(m, 'YYYY-MM-DD');
        update follow_ups set expiry_date = d where id = r.id;
      exception when others then null;
      end;
    end if;
  end loop;
end $$;

-- 3. Backfill client_email / client_name from project -> client (where empty)
update follow_ups f
set client_email = c.email,
    client_name = c.contact_person
from projects p
join clients c on c.id = p.client_id
where f.project_id = p.id
  and (f.client_email is null or f.client_email = '')
  and c.email is not null;
