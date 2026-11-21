-- DÉMO : la règle « on n'appelle et ne scanne que les plats du jour » est assouplie.
-- Pour la production : rétablir le déclencheur 0019 et ne garder que « day = jour du scan » dans confirm_pickup.
drop trigger if exists service_calls_only_today on public.service_calls;

create or replace function public.confirm_pickup(p_token text, p_scanned_at timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_token is distinct from (select qr_token from public.settings where id = 1) then raise exception 'bad_qr'; end if;
  update public.orders o set status = 'received', received_at = p_scanned_at
   where o.student_id = auth.uid() and o.status = 'ordered'
     and (o.day = (p_scanned_at at time zone 'Africa/Abidjan')::date
          or exists (select 1 from public.service_calls sc where sc.day = o.day and sc.dish_id = o.dish_id and sc.called_at is not null));
  get diagnostics n = row_count;
  return n;
end $$;
