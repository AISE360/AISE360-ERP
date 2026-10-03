create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone, 'Founder'),
    new.phone
  )
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$func$;
