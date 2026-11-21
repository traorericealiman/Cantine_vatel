-- Mode « me demander » des favoris : dès qu'un plat favori est au menu publié (7 prochains jours), l'élève reçoit une proposition à confirmer (Oui / Non).
-- (Le mode « commander automatiquement » reste dans 0016.)
alter table public.favorites add column if not exists ask boolean not null default false;

create or replace function public.ask_order_dish(p_day date, p_dish text) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dishes; f record; p public.profiles; hay text;
begin
  select * into d from public.dishes where id = p_dish and active;
  if not found then return; end if;
  if not exists (select 1 from public.menu_items where day = p_day and dish_id = p_dish and published) then return; end if;
  if not public.is_open(p_day) then return; end if;
  hay := lower(d.fr || ' ' || d.en || ' ' || coalesce((select string_agg((c->>'fr') || ' ' || (c->>'en'), ' ') from jsonb_array_elements(d.components) c), ''));
  for f in select id, student_id from public.favorites where dish_id = p_dish and ask and not auto_order loop
    if exists (select 1 from public.orders o join public.dishes d2 on d2.id = o.dish_id
                where o.student_id = f.student_id and o.day = p_day and o.status <> 'cancelled' and d2.cat = d.cat) then continue; end if;
    select * into p from public.profiles where id = f.student_id;
    if p.allergies && d.allergens then continue; end if;
    if exists (select 1 from unnest(p.custom_allergies) a where length(trim(a)) >= 3 and hay like '%' || lower(trim(a)) || '%') then continue; end if;
    insert into public.proposals (student_id, favorite_id, dish_id, day, status) values (f.student_id, f.id, p_dish, p_day, 'pending')
      on conflict (student_id, dish_id, day) do nothing;
  end loop;
end $$;

create or replace function public.ask_on_menu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.published and new.day between public.local_now()::date and public.local_now()::date + 7 then
    perform public.ask_order_dish(new.day, new.dish_id);
  end if;
  return new;
end $$;
create trigger menu_items_ask after insert or update of published, dish_id on public.menu_items
  for each row execute function public.ask_on_menu();

create or replace function public.ask_on_favorite() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.auto_order then
    update public.proposals set status = 'declined' where favorite_id = new.id and status = 'pending';
  elsif new.ask then
    for r in select day from public.menu_items
              where dish_id = new.dish_id and published
                and day between public.local_now()::date and public.local_now()::date + 7 loop
      perform public.ask_order_dish(r.day, new.dish_id);
    end loop;
  else
    delete from public.proposals where favorite_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
create trigger favorites_ask after insert or update of ask, auto_order on public.favorites
  for each row execute function public.ask_on_favorite();

revoke execute on function public.ask_order_dish(date, text), public.ask_on_menu(), public.ask_on_favorite() from public, anon, authenticated;

-- L'élève peut répondre (refuser) à ses propres propositions ; l'acceptation passe par place_order.
create policy prop_answer on public.proposals for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
