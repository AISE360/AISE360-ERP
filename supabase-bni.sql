-- Networking contacts (BNI + all future meets) — run in Supabase SQL editor
create table if not exists bni_contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text not null,
  email text,
  phone text,
  power_team int not null default 1 check (power_team between 1 and 6),
  meet_name text not null default 'BNI Meet',
  status text not null default 'new'
    check (status in ('new','contacted','follow-up','in-crm','in-clients','not-interested')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for existing installs:
alter table bni_contacts add column if not exists meet_name text not null default 'BNI Meet';

alter table bni_contacts enable row level security;

drop policy if exists "Authenticated users can do everything on bni_contacts" on bni_contacts;
create policy "Authenticated users can do everything on bni_contacts"
  on bni_contacts for all to authenticated using (true) with check (true);

create index if not exists idx_bni_contacts_team on bni_contacts(power_team);
create index if not exists idx_bni_contacts_status on bni_contacts(status);
create index if not exists idx_bni_contacts_meet on bni_contacts(meet_name);
