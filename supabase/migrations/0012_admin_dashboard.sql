-- Chiffres du tableau de bord admin, calculés dans la base à partir des vraies commandes, paiements et stocks.
-- Recettes = commandes (non annulées) du jour de service ; les prévisions utilisent la moyenne des 4 dernières semaines.

create or replace function public.period_stats(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public as $$
  with o as (
    select ord.*, d.price as list_price
      from public.orders ord join public.dishes d on d.id = ord.dish_id
     where ord.day between p_from and p_to and ord.status <> 'cancelled'
  )
  select jsonb_build_object(
    'revenue', coalesce(sum(price + fee), 0),
    'sold', count(*),
    'promo', count(*) filter (where price < list_price),
    'standard', count(*) filter (where price >= list_price),
    'promoRevenue', coalesce(sum(price + fee) filter (where price < list_price), 0),
    'standardRevenue', coalesce(sum(price + fee) filter (where price >= list_price), 0),
    'satisfaction', coalesce(round(100.0 * count(*) filter (where vote = 1) / nullif(count(*) filter (where vote is not null), 0)), 0),
    'topDish', (select dish_id from o group by dish_id order by count(*) desc, dish_id limit 1),
    'cancelled', (select count(*) from public.orders where day between p_from and p_to and status = 'cancelled')
  ) from o;
$$;

create or replace function public.admin_dashboard(p_day date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.settings;
  prev_day date := p_day - case extract(isodow from p_day)::int when 1 then 3 else 1 end;
  wk date := date_trunc('week', p_day)::date;
  mo date := date_trunc('month', p_day)::date;
  nd date := p_day + case extract(isodow from p_day)::int when 5 then 3 when 6 then 2 else 1 end;
  nwk date := date_trunc('week', p_day)::date + 7;
  tomorrow_placed integer; tomorrow_avg numeric; week_forecast numeric := 0;
  theo numeric; actual numeric; budget numeric; needs jsonb;
  d date;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into s from public.settings where id = 1;

  -- Prévision du prochain jour de service : le plus grand entre les commandes déjà reçues et la moyenne des 4 mêmes jours précédents.
  select count(*) into tomorrow_placed from public.orders where day = nd and status <> 'cancelled';
  select coalesce(avg(n), 0) into tomorrow_avg from (
    select count(*) n from public.orders where status <> 'cancelled' and day in (nd - 7, nd - 14, nd - 21, nd - 28) group by day
  ) x;

  -- Recettes prévues pour la semaine suivante : moyenne des recettes du même jour de la semaine (4 dernières semaines).
  for d in select generate_series(nwk, nwk + 4, interval '1 day')::date loop
    week_forecast := week_forecast + coalesce((
      select avg(r) from (select sum(price + fee) r from public.orders where status <> 'cancelled' and day in (d - 7, d - 14, d - 21, d - 28) group by day) y
    ), 0);
  end loop;

  -- Besoins en ingrédients pour une semaine type (portions moyennes des 4 dernières semaines × recettes) moins le stock.
  select jsonb_agg(jsonb_build_object('id', id, 'need', need, 'stock', stock, 'toBuy', to_buy, 'cost', cost) order by cost desc),
         coalesce(sum(cost), 0)
    into needs, budget
    from (
      select i.id, round(sum(r.qty_per_portion * w.n / 4.0), 1) as need, i.stock,
             greatest(round(sum(r.qty_per_portion * w.n / 4.0), 1) - i.stock, 0) as to_buy,
             greatest(round(sum(r.qty_per_portion * w.n / 4.0), 1) - i.stock, 0) * i.price as cost
        from (select dish_id, count(*) n from public.orders where status <> 'cancelled' and day >= p_day - 28 and day < p_day group by dish_id) w
        join public.recipes r on r.dish_id = w.dish_id
        join public.ingredients i on i.id = r.ingredient_id
       group by i.id, i.stock, i.price
    ) z where to_buy > 0;

  -- Écart de stock de la semaine : consommation réelle (journal) contre consommation théorique (commandes × recettes).
  select coalesce(sum(r.qty_per_portion * i.price), 0) into theo
    from public.orders o join public.recipes r on r.dish_id = o.dish_id join public.ingredients i on i.id = r.ingredient_id
   where o.status <> 'cancelled' and o.day between wk and wk + 6;
  select coalesce(sum(u.qty * i.price), 0) into actual
    from public.usages u join public.ingredients i on i.id = u.ingredient_id
   where (u.at at time zone 'Africa/Abidjan')::date between wk and wk + 6;

  return jsonb_build_object(
    'day', public.period_stats(p_day, p_day) || jsonb_build_object('previous', (public.period_stats(prev_day, prev_day)->>'revenue')::numeric),
    'week', public.period_stats(wk, wk + 6) || jsonb_build_object('previous', (public.period_stats(wk - 7, wk - 1)->>'revenue')::numeric),
    'month', public.period_stats(mo, (mo + interval '1 month - 1 day')::date)
            || jsonb_build_object('previous', (public.period_stats((mo - interval '1 month')::date, mo - 1)->>'revenue')::numeric),
    'chartDay', (select jsonb_agg(jsonb_build_object('d', x.d, 'revenue', (public.period_stats(x.d, x.d)->>'revenue')::numeric, 'sold', (public.period_stats(x.d, x.d)->>'sold')::int) order by x.d)
                   from (select (p_day - g)::date d from generate_series(0, 6) g where extract(isodow from p_day - g) < 6 order by g limit 5) x),
    'chartWeek', (select jsonb_agg(jsonb_build_object('d', x.d, 'revenue', (public.period_stats(x.d, x.d + 6)->>'revenue')::numeric, 'sold', (public.period_stats(x.d, x.d + 6)->>'sold')::int) order by x.d)
                    from (select (wk - 7 * g)::date d from generate_series(0, 5) g) x),
    'chartMonth', (select jsonb_agg(jsonb_build_object('d', x.d, 'revenue', (public.period_stats(x.d, (x.d + interval '1 month - 1 day')::date)->>'revenue')::numeric, 'sold', (public.period_stats(x.d, (x.d + interval '1 month - 1 day')::date)->>'sold')::int) order by x.d)
                     from (select (mo - (g || ' month')::interval)::date d from generate_series(0, 4) g) x),
    'creditTotal', (select coalesce(sum(debt), 0) from public.wallets),
    'creditStudents', (select count(*) from public.wallets where debt > 0),
    'pickupsToday', (select count(*) from public.orders where day = p_day and status <> 'cancelled'),
    'pickupsDone', (select count(*) from public.orders where day = p_day and status = 'received'),
    'students', (select count(*) from public.profiles where role = 'student'),
    'parents', (select count(*) from public.profiles where role = 'parent'),
    'subscriptions', (select count(*) from public.subscriptions where current_date between starts_on and ends_on),
    'refunds', (select count(*) from public.wallet_transactions where kind = 'refund' and (at at time zone 'Africa/Abidjan')::date between wk and wk + 6),
    'creditMeals', (select count(*) from public.orders where on_credit and day between wk and wk + 6 and status <> 'cancelled'),
    'creditFees', (select coalesce(sum(fee), 0) from public.orders where on_credit and day between wk and wk + 6 and status <> 'cancelled'),
    'lowAlerts', (select count(*) from public.notifications where kind = 'low' and (created_at at time zone 'Africa/Abidjan')::date between wk and wk + 6),
    'forecastDishes', greatest(tomorrow_placed, round(tomorrow_avg)),
    'forecastWeekRevenue', round(week_forecast),
    'budgetNext', round(budget),
    'needs', coalesce(needs, '[]'::jsonb),
    'lossValue', greatest(round(actual - theo), 0),
    'lossPct', case when theo > 0 then greatest(round(100.0 * (actual - theo) / theo, 1), 0) else 0 end
  );
end $$;

revoke execute on function public.period_stats(date, date) from public, anon, authenticated;
revoke execute on function public.admin_dashboard(date) from public, anon;
grant execute on function public.admin_dashboard(date) to authenticated;

-- Commentaires laissés par les élèves sur les plats (lisibles par l'admin seulement).
create or replace function public.admin_comments() returns table (dish_id text, author text, vote smallint, comment text, at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  return query
    select o.dish_id, p.first_name || ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.', o.vote, o.comment, o.created_at
      from public.orders o join public.profiles p on p.id = o.student_id
     where o.comment is not null and o.comment <> ''
     order by o.created_at desc limit 40;
end $$;
revoke execute on function public.admin_comments() from public, anon;
grant execute on function public.admin_comments() to authenticated;
