alter table profiles add column if not exists phone text unique;
alter table profiles alter column email drop not null;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $func$
begin
  insert into profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone, 'Founder'),
    new.phone
  )
  on conflict (id) do update set
    phone = coalesce(excluded.phone, profiles.phone),
    email = coalesce(excluded.email, profiles.email);
  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
