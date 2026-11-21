-- « Commander automatiquement » : quand un plat favori (avec l'option activée) est au menu publié, la base le commande
-- pour l'élève et le prévient. Garde-fous : avant l'heure limite, solde suffisant (jamais de crédit d'urgence),
-- aucune allergie, un seul plat par catégorie et par jour. Si le solde manque, l'élève est prévenu (une seule fois).
create or replace function public.auto_order_dish(p_day date, p_dish text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.dishes; s public.settings; f record; w public.wallets; p public.profiles;
  v_price integer; hay text;
begin
  select * into d from public.dishes where id = p_dish and active;
  if not found then return; end if;
  if not exists (select 1 from public.menu_items where day = p_day and dish_id = p_dish and published) then return; end if;
  if not public.is_open(p_day) then return; end if;
  select * into s from public.settings where id = 1;
  hay := lower(d.fr || ' ' || d.en || ' ' || coalesce((select string_agg((c->>'fr') || ' ' || (c->>'en'), ' ') from jsonb_array_elements(d.components) c), ''));

  for f in select student_id from public.favorites where dish_id = p_dish and auto_order loop
    if exists (select 1 from public.orders o join public.dishes d2 on d2.id = o.dish_id
                where o.student_id = f.student_id and o.day = p_day and o.status <> 'cancelled' and d2.cat = d.cat) then continue; end if;
    select * into p from public.profiles where id = f.student_id;
    if p.allergies && d.allergens then continue; end if;
    if exists (select 1 from unnest(p.custom_allergies) a where length(trim(a)) >= 3 and hay like '%' || lower(trim(a)) || '%') then continue; end if;

    v_price := d.price;
    if d.cat = 'main' and exists (select 1 from public.subscriptions where student_id = f.student_id and current_date between starts_on and ends_on) then
      v_price := least(d.price, s.promo_dish_price);
    end if;

    select * into w from public.wallets where student_id = f.student_id for update;
    if not found or w.balance < v_price then
      if not exists (select 1 from public.notifications n where n.user_id = f.student_id and n.kind = 'auto_fail'
                      and n.data->>'dish' = p_dish and n.data->>'day' = p_day::text) then
        perform public.push_to(array[f.student_id], 'auto_fail', 'Commande automatique impossible',
                               'Solde insuffisant pour ' || d.fr || '.', jsonb_build_object('dish', p_dish, 'day', p_day));
      end if;
      continue;
    end if;

    update public.wallets set balance = balance - v_price where student_id = f.student_id;
    insert into public.orders (student_id, dish_id, day, price) values (f.student_id, p_dish, p_day, v_price);
    insert into public.wallet_transactions (student_id, kind, amount, dish_id) values (f.student_id, 'order', -v_price, p_dish);
    perform public.push_to(array[f.student_id], 'auto_order', 'Plat commandé pour toi',
                           d.fr || ' a été commandé automatiquement.', jsonb_build_object('dish', p_dish, 'day', p_day));
  end loop;
end $$;

-- Un plat favori est publié au menu d'un jour.
create or replace function public.auto_order_on_menu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.published then perform public.auto_order_dish(new.day, new.dish_id); end if;
  return new;
end $$;
create trigger menu_items_auto_order after insert or update of published, dish_id on public.menu_items
  for each row execute function public.auto_order_on_menu();

-- L'élève active l'option : on commande tout de suite pour les jours déjà au menu (encore ouverts).
create or replace function public.auto_order_on_favorite() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not new.auto_order then return new; end if;
  for r in select day from public.menu_items where dish_id = new.dish_id and published and day >= public.local_now()::date loop
    perform public.auto_order_dish(r.day, new.dish_id);
  end loop;
  return new;
end $$;
create trigger favorites_auto_order after insert or update of auto_order on public.favorites
  for each row execute function public.auto_order_on_favorite();

revoke execute on function public.auto_order_dish(date, text), public.auto_order_on_menu(), public.auto_order_on_favorite() from public, anon, authenticated;
