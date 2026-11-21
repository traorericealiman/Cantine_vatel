-- La commande automatique ne couvre que les 7 prochains jours (jamais trois semaines d'un coup).
create or replace function public.auto_order_on_favorite() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not new.auto_order then return new; end if;
  for r in select day from public.menu_items
            where dish_id = new.dish_id and published
              and day between public.local_now()::date and public.local_now()::date + 7 loop
    perform public.auto_order_dish(r.day, new.dish_id);
  end loop;
  return new;
end $$;

create or replace function public.auto_order_on_menu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.published and new.day between public.local_now()::date and public.local_now()::date + 7 then
    perform public.auto_order_dish(new.day, new.dish_id);
  end if;
  return new;
end $$;
