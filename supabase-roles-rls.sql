-- AISE360 ERP: roles (founder/admin/employee), finance RLS lockdown, login alerts
-- Applied to live Supabase project. Resend key lives in vault (name 'resend_api_key'), NOT here.

-- @@SPLIT@@
alter table public.profiles drop constraint if exists profiles_role_check;

-- @@SPLIT@@
alter table public.profiles add constraint profiles_role_check check (role in ('founder', 'admin', 'employee'));

-- @@SPLIT@@
alter table public.profiles alter column role set default 'employee';

-- @@SPLIT@@
delete from public.profiles where email = 'otp-probe@example.com';

-- @@SPLIT@@
delete from auth.users where email = 'otp-probe@example.com';

-- @@SPLIT@@
create or replace function public.my_role()
returns text language sql security definer set search_path = public stable as $func$
  select role from public.profiles where id = auth.uid()
$func$;

-- @@SPLIT@@
create or replace function public.is_privileged()
returns boolean language sql security definer set search_path = public stable as $func$
  select coalesce((select role from public.profiles where id = auth.uid()), 'employee') in ('founder', 'admin')
$func$;

-- @@SPLIT@@
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone, 'Founder'),
    new.phone,
    case when lower(coalesce(new.email, '')) in (
      'zaidrocks2005@gmail.com',
      'mohammadsufiyansajan@gmail.com',
      'farooquegamings@gmail.com',
      'abidtamboli71@gmail.com',
      'amathur0821@gmail.com'
    ) then 'founder' else 'employee' end
  )
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$func$;

-- @@SPLIT@@
update public.profiles set role = 'founder' where lower(email) in (
  'zaidrocks2005@gmail.com',
  'mohammadsufiyansajan@gmail.com',
  'farooquegamings@gmail.com',
  'abidtamboli71@gmail.com',
  'amathur0821@gmail.com'
);

-- @@SPLIT@@
update public.profiles set role = 'employee' where role not in ('founder', 'admin') and lower(email) not in (
  'zaidrocks2005@gmail.com',
  'mohammadsufiyansajan@gmail.com',
  'farooquegamings@gmail.com',
  'abidtamboli71@gmail.com',
  'amathur0821@gmail.com'
);

-- @@SPLIT@@
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- @@SPLIT@@
alter table public.login_events enable row level security;

-- @@SPLIT@@
drop policy if exists "Own login events can be logged" on public.login_events;

-- @@SPLIT@@
create policy "Own login events can be logged"
  on public.login_events for insert to authenticated
  with check (auth.uid() = user_id);

-- @@SPLIT@@
drop policy if exists "Privileged can view login events" on public.login_events;

-- @@SPLIT@@
create policy "Privileged can view login events"
  on public.login_events for select to authenticated
  using (public.is_privileged());

-- @@SPLIT@@
create or replace function public.notify_login()
returns trigger language plpgsql security definer set search_path = public, net, vault as $func$
declare
  api_key text;
  who text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then
    return new;
  end if;
  who := coalesce(new.email, new.phone, new.user_id::text);
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'AISE360 ERP <noreply@aise360.com>',
      'to', jsonb_build_array('contact@aise.com'),
      'subject', 'ERP login: ' || who,
      'text', 'Sign-in to AISE360 ERP at ' || coalesce(new.created_at::text, now()::text) || E'\nUser: ' || who || E'\nUser ID: ' || coalesce(new.user_id::text, '-')
    )
  );
  return new;
end;
$func$;

-- @@SPLIT@@
drop trigger if exists on_login_event on public.login_events;

-- @@SPLIT@@
create trigger on_login_event
  after insert on public.login_events
  for each row execute procedure public.notify_login();

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on expenses" on public.expenses;

-- @@SPLIT@@
create policy "Privileged full access to expenses"
  on public.expenses for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on company_expenses" on public.company_expenses;

-- @@SPLIT@@
create policy "Privileged full access to company_expenses"
  on public.company_expenses for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on financial_entries" on public.financial_entries;

-- @@SPLIT@@
create policy "Privileged full access to financial_entries"
  on public.financial_entries for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on invoices" on public.invoices;

-- @@SPLIT@@
create policy "Privileged full access to invoices"
  on public.invoices for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on bank_transactions" on public.bank_transactions;

-- @@SPLIT@@
create policy "Privileged full access to bank_transactions"
  on public.bank_transactions for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on client_credentials" on public.client_credentials;

-- @@SPLIT@@
create policy "Privileged full access to client_credentials"
  on public.client_credentials for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can insert audit logs" on public.credential_audit_logs;

-- @@SPLIT@@
drop policy if exists "Authenticated users can view audit logs" on public.credential_audit_logs;

-- @@SPLIT@@
create policy "Privileged full access to credential_audit_logs"
  on public.credential_audit_logs for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());

-- @@SPLIT@@
drop policy if exists "Authenticated users can do everything on profiles" on public.profiles;

-- @@SPLIT@@
create policy "Profiles readable by authenticated"
  on public.profiles for select to authenticated
  using (true);

-- @@SPLIT@@
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- @@SPLIT@@
create policy "Users can update own profile without role change"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.my_role());

-- @@SPLIT@@
create policy "Privileged full access to profiles"
  on public.profiles for all to authenticated
  using (public.is_privileged()) with check (public.is_privileged());
