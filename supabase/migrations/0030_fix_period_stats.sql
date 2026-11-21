-- La colonne orders.list_price (0028) entrait en conflit avec l'alias list_price : admin_dashboard échouait et les KPI restaient vides.
-- Le prix de référence est celui enregistré à la commande, sinon le prix actuel du plat (anciennes commandes).
create or replace function public.period_stats(p_from date, p_to date)
returns jsonb
language sql stable security definer set search_path = public as $$
  with o as (
    select ord.*, coalesce(ord.list_price, d.price) as full_price
      from public.orders ord join public.dishes d on d.id = ord.dish_id
     where ord.day between p_from and p_to and ord.status <> 'cancelled'
  )
  select jsonb_build_object(
    'revenue', coalesce(sum(price + fee), 0),
    'sold', count(*),
    'promo', count(*) filter (where price < full_price),
    'standard', count(*) filter (where price >= full_price),
    'promoRevenue', coalesce(sum(price + fee) filter (where price < full_price), 0),
    'standardRevenue', coalesce(sum(price + fee) filter (where price >= full_price), 0),
    'satisfaction', coalesce(round(100.0 * count(*) filter (where vote = 1) / nullif(count(*) filter (where vote is not null), 0)), 0),
    'topDish', (select dish_id from o group by dish_id order by count(*) desc, dish_id limit 1),
    'cancelled', (select count(*) from public.orders where day between p_from and p_to and status = 'cancelled')
  ) from o;
$$;

revoke execute on function public.period_stats(date, date) from public, anon, authenticated;
