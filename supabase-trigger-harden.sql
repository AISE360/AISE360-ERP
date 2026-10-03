create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone, 'Founder'),
    new.phone,
    case when lower(trim(coalesce(new.email, ''))) in (
      'zaidrocks2005@gmail.com',
      'mohammadsufiyansajan@gmail.com',
      'farooquegamings@gmail.com',
      'abidtamboli71@gmail.com',
      'amathur0821@gmail.com'
    ) then 'founder' else 'employee' end
  )
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email),
    role = excluded.role;
  return new;
end;
$func$;
