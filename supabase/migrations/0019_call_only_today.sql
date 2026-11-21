-- On ne peut appeler un plat que le jour même : un plat « disponible » doit pouvoir être retiré (le retrait ne valide que les commandes du jour).
create or replace function public.check_call_day() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.called_at is not null and new.day <> public.local_now()::date then
    raise exception 'only_today';
  end if;
  return new;
end $$;
create trigger service_calls_only_today before insert or update on public.service_calls
  for each row execute function public.check_call_day();
revoke execute on function public.check_call_day() from public, anon, authenticated;
