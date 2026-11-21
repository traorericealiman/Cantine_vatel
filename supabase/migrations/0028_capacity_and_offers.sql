-- 1) Nombre de plats par jour (quota) : le premier arrivé, le premier servi.
-- 2) Commande automatique des favoris (de retour) : « me demander » ou « commander tout de suite ».
-- 3) Offres promotionnelles : semaine (5 %), mois (7 %), année (15 %) ; une seule à la fois ; la réduction se voit au paiement.

-- Anciens déclencheurs et fonctions remplacés plus bas
drop trigger if exists menu_items_ask on public.menu_items;
drop trigger if exists menu_items_auto_order on public.menu_items;
drop trigger if exists favorites_ask on public.favorites;
drop trigger if exists favorites_auto_order on public.favorites;
drop function if exists public.ask_on_menu(), public.ask_on_favorite(), public.auto_order_on_menu(), public.auto_order_on_favorite();
drop function if exists public.auto_order_dish(date, text), public.ask_order_dish(date, text);

-- ---------- Quota de plats
alter table public.menu_items add column if not exists capacity integer check (capacity is null or capacity >= 0);

-- Combien de plats déjà commandés pour ce plat ce jour-là
create or replace function public.dish_ordered(p_day date, p_dish text) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.orders where day = p_day and dish_id = p_dish and status <> 'cancelled'
$$;

-- Quotas et plats déjà pris, lisibles par tous les élèves (aucune donnée personnelle).
create or replace function public.menu_availability(p_from date, p_to date)
returns table (day date, dish_id text, capacity integer, ordered integer)
language sql stable security definer set search_path = public as $$
  select m.day, m.dish_id, m.capacity, public.dish_ordered(m.day, m.dish_id)
    from public.menu_items m
   where m.published and m.capacity is not null and m.day between p_from and p_to
$$;

-- ---------- Offres
create table if not exists public.offers (
  id text primary key check (id in ('week', 'month', 'year')),
  pct integer not null check (pct between 1 and 90),      -- réduction sur le prix de chaque plat
  days integer not null check (days > 0),                 -- durée de l'offre
  fee integer not null default 0 check (fee >= 0),        -- prix de l'abonnement (modifiable par l'admin)
  sort smallint not null
);
insert into public.offers (id, pct, days, fee, sort) values
  ('week', 5, 7, 200, 1), ('month', 7, 30, 800, 2), ('year', 15, 365, 8000, 3)
on conflict (id) do nothing;
alter table public.offers enable row level security;
create policy offers_read on public.offers for select to authenticated using (true);
create policy offers_admin on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.subscriptions add column if not exists offer_id text references public.offers(id) default 'year';
update public.subscriptions set offer_id = 'year' where offer_id is null;
alter table public.payments add column if not exists offer_id text references public.offers(id);
alter table public.orders add column if not exists list_price integer;                -- prix du catalogue avant réduction
alter table public.wallet_transactions add column if not exists list_amount integer;  -- montant avant réduction (négatif pour une commande)

-- Réduction en cours d'un élève (0 sans offre)
create or replace function public.current_discount(p_student uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select o.pct from public.subscriptions s join public.offers o on o.id = s.offer_id
                    where s.student_id = p_student and public.local_now()::date between s.starts_on and s.ends_on), 0)
$$;

-- ---------- Commande : quota + réduction
create or replace function public.place_order(p_dish text, p_day date, p_removed text[] default '{}')
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.dishes; s public.settings; w public.wallets;
  v_list integer; v_price integer; v_fee integer := 0; v_credit boolean := false;
  v_cap integer; v_pct integer; o public.orders;
begin
  if public.my_role() is distinct from 'student' then raise exception 'only_students'; end if;
  select * into d from public.dishes where id = p_dish and active;
  if not found then raise exception 'unknown_dish'; end if;
  -- On verrouille la ligne du menu : deux élèves ne peuvent pas prendre le dernier plat en même temps.
  select capacity into v_cap from public.menu_items where day = p_day and dish_id = p_dish and published limit 1 for update;
  if not found then raise exception 'not_on_menu'; end if;
  if not public.is_open(p_day) then raise exception 'closed'; end if;
  if exists (select 1 from public.orders o2 join public.dishes d2 on d2.id = o2.dish_id
             where o2.student_id = me and o2.day = p_day and o2.status <> 'cancelled' and d2.cat = d.cat) then
    raise exception 'category_taken';
  end if;
  if v_cap is not null and public.dish_ordered(p_day, p_dish) >= v_cap then raise exception 'sold_out'; end if;

  select * into s from public.settings where id = 1;
  v_list := d.price;
  v_pct := public.current_discount(me);
  v_price := round(v_list * (100 - v_pct) / 100.0);

  select * into w from public.wallets where student_id = me for update;
  if not found then insert into public.wallets (student_id) values (me) returning * into w; end if;

  if w.balance >= v_price then
    update public.wallets set balance = balance - v_price where student_id = me;
  elsif w.credit_count < s.max_credit then
    v_credit := true;
    v_fee := case when w.credit_count = 0 then 0 else round(v_price * s.credit_fee_rate) end;
    update public.wallets set debt = debt + v_price + v_fee, credit_count = credit_count + 1 where student_id = me;
  else
    raise exception 'credit_limit';
  end if;

  insert into public.orders (student_id, dish_id, day, removed, price, fee, on_credit, list_price)
  values (me, p_dish, p_day, coalesce(p_removed, '{}'), v_price, v_fee, v_credit, case when v_pct > 0 then v_list end) returning * into o;
  insert into public.wallet_transactions (student_id, kind, amount, credit, dish_id, list_amount)
  values (me, 'order', -(v_price + v_fee), v_credit, p_dish, case when v_pct > 0 then -(v_list + v_fee) end);
  update public.proposals set status = 'accepted' where student_id = me and dish_id = p_dish and day = p_day and status = 'pending';
  return o;
end $$;

-- ---------- Commande automatique (de retour) : respecte le quota, la réduction, et l'ordre d'ajout des favoris
create or replace function public.auto_order_dish(p_day date, p_dish text, p_skip uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.dishes; f record; w public.wallets; p public.profiles;
  v_list integer; v_price integer; v_pct integer; v_cap integer; hay text;
begin
  select * into d from public.dishes where id = p_dish and active;
  if not found then return; end if;
  select capacity into v_cap from public.menu_items where day = p_day and dish_id = p_dish and published limit 1 for update;
  if not found then return; end if;
  if not public.is_open(p_day) then return; end if;
  hay := lower(d.fr || ' ' || d.en || ' ' || coalesce((select string_agg((c->>'fr') || ' ' || (c->>'en'), ' ') from jsonb_array_elements(d.components) c), ''));

  for f in select id, student_id from public.favorites where dish_id = p_dish and auto_order and student_id is distinct from p_skip order by created_at loop
    if v_cap is not null and public.dish_ordered(p_day, p_dish) >= v_cap then return; end if;
    if exists (select 1 from public.orders o join public.dishes d2 on d2.id = o.dish_id
                where o.student_id = f.student_id and o.day = p_day and o.status <> 'cancelled' and d2.cat = d.cat) then continue; end if;
    select * into p from public.profiles where id = f.student_id;
    if p.allergies && d.allergens then continue; end if;
    if exists (select 1 from unnest(p.custom_allergies) a where length(trim(a)) >= 3 and hay like '%' || lower(trim(a)) || '%') then continue; end if;

    v_list := d.price;
    v_pct := public.current_discount(f.student_id);
    v_price := round(v_list * (100 - v_pct) / 100.0);

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
    perform set_config('vatel.auto', '1', true);
    insert into public.orders (student_id, dish_id, day, price, list_price)
    values (f.student_id, p_dish, p_day, v_price, case when v_pct > 0 then v_list end);
    insert into public.wallet_transactions (student_id, kind, amount, dish_id, list_amount)
    values (f.student_id, 'order', -v_price, p_dish, case when v_pct > 0 then -v_list end);
    perform public.push_to(array[f.student_id], 'auto_order', 'Plat commandé pour toi',
                           d.fr || ' a été commandé automatiquement.', jsonb_build_object('dish', p_dish, 'day', p_day));
  end loop;
end $$;

-- « Me demander » : pas de proposition pour un plat déjà complet, et l'ordre d'ajout des favoris décide.
create or replace function public.ask_order_dish(p_day date, p_dish text, p_skip uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dishes; f record; p public.profiles; hay text; v_cap integer;
begin
  select * into d from public.dishes where id = p_dish and active;
  if not found then return; end if;
  select capacity into v_cap from public.menu_items where day = p_day and dish_id = p_dish and published limit 1;
  if not found then return; end if;
  if not public.is_open(p_day) then return; end if;
  if v_cap is not null and public.dish_ordered(p_day, p_dish) >= v_cap then return; end if;
  hay := lower(d.fr || ' ' || d.en || ' ' || coalesce((select string_agg((c->>'fr') || ' ' || (c->>'en'), ' ') from jsonb_array_elements(d.components) c), ''));
  for f in select id, student_id from public.favorites where dish_id = p_dish and ask and not auto_order and student_id is distinct from p_skip order by created_at loop
    if exists (select 1 from public.orders o join public.dishes d2 on d2.id = o.dish_id
                where o.student_id = f.student_id and o.day = p_day and o.status <> 'cancelled' and d2.cat = d.cat) then continue; end if;
    select * into p from public.profiles where id = f.student_id;
    if p.allergies && d.allergens then continue; end if;
    if exists (select 1 from unnest(p.custom_allergies) a where length(trim(a)) >= 3 and hay like '%' || lower(trim(a)) || '%') then continue; end if;
    insert into public.proposals (student_id, favorite_id, dish_id, day, status) values (f.student_id, f.id, p_dish, p_day, 'pending')
      on conflict (student_id, dish_id, day) do nothing;
  end loop;
end $$;

-- Déclencheurs : plat publié, quota relevé, favori ajouté, plat libéré par une annulation
create or replace function public.favorites_on_menu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.published and new.day between public.local_now()::date and public.local_now()::date + 7 then
    perform public.auto_order_dish(new.day, new.dish_id);
    perform public.ask_order_dish(new.day, new.dish_id);
  end if;
  return new;
end $$;
drop trigger if exists menu_items_ask on public.menu_items;
drop trigger if exists menu_items_auto_order on public.menu_items;
create trigger menu_items_favorites after insert or update of published, dish_id, capacity on public.menu_items
  for each row execute function public.favorites_on_menu();

create or replace function public.favorites_on_favorite() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.auto_order then
    update public.proposals set status = 'declined' where favorite_id = new.id and status = 'pending';
    for r in select day from public.menu_items where dish_id = new.dish_id and published
              and day between public.local_now()::date and public.local_now()::date + 7 loop
      perform public.auto_order_dish(r.day, new.dish_id);
    end loop;
  elsif new.ask then
    for r in select day from public.menu_items where dish_id = new.dish_id and published
              and day between public.local_now()::date and public.local_now()::date + 7 loop
      perform public.ask_order_dish(r.day, new.dish_id);
    end loop;
  else
    delete from public.proposals where favorite_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists favorites_ask on public.favorites;
drop trigger if exists favorites_auto_order on public.favorites;
create trigger favorites_modes after insert or update of ask, auto_order on public.favorites
  for each row execute function public.favorites_on_favorite();

-- Un plat se libère (annulation) : on le propose, ou on le commande, aux favoris suivants (jamais à celui qui vient d'annuler).
create or replace function public.favorites_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform public.auto_order_dish(new.day, new.dish_id, new.student_id);
    perform public.ask_order_dish(new.day, new.dish_id, new.student_id);
  end if;
  return new;
end $$;
create trigger orders_free_portion after update of status on public.orders
  for each row execute function public.favorites_on_cancel();

-- ---------- Souscription (une seule offre à la fois)
create or replace function public.can_subscribe(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.subscriptions where student_id = p_student and ends_on >= public.local_now()::date)
$$;

create or replace function public.activate_offer(p_student uuid, p_offer text, p_payment uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.offers; today date := public.local_now()::date;
begin
  select * into o from public.offers where id = p_offer;
  if not found then raise exception 'unknown_offer'; end if;
  if not public.can_subscribe(p_student) then raise exception 'already_subscribed'; end if;
  insert into public.subscriptions (student_id, offer_id, starts_on, ends_on, payment_id)
  values (p_student, o.id, today, today + o.days - 1, p_payment)
  on conflict (student_id) do update set offer_id = excluded.offer_id, starts_on = excluded.starts_on, ends_on = excluded.ends_on, payment_id = excluded.payment_id;
end $$;

drop function if exists public.demo_subscribe(uuid);
create or replace function public.demo_subscribe(p_student uuid, p_offer text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (select demo_mode from public.settings where id = 1) then raise exception 'demo_disabled'; end if;
  if not public.can_see_student(p_student) then raise exception 'forbidden'; end if;
  perform public.activate_offer(p_student, p_offer, null);
end $$;

-- Droits : seules les fonctions utiles aux applications sont appelables
revoke execute on function public.dish_ordered(date, text), public.can_subscribe(uuid), public.current_discount(uuid),
  public.activate_offer(uuid, text, uuid), public.auto_order_dish(date, text, uuid), public.ask_order_dish(date, text, uuid),
  public.favorites_on_menu(), public.favorites_on_favorite(), public.favorites_on_cancel() from public, anon, authenticated;
revoke execute on function public.menu_availability(date, date), public.demo_subscribe(uuid, text) from public, anon;
grant execute on function public.menu_availability(date, date), public.demo_subscribe(uuid, text), public.place_order(text, date, text[]) to authenticated;
grant execute on function public.can_subscribe(uuid), public.current_discount(uuid) to authenticated;
