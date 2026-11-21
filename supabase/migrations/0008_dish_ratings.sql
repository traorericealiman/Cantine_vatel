-- Avis agrégés par plat (pourcentage de pouces verts et nombre de votes), visibles par tous sans exposer les commentaires.
create or replace view public.dish_ratings with (security_invoker = false) as
select dish_id,
       count(*) filter (where vote is not null)::int as votes,
       coalesce(round(100.0 * count(*) filter (where vote = 1) / nullif(count(*) filter (where vote is not null), 0)), 0)::int as likes
from public.orders
group by dish_id;
revoke all on public.dish_ratings from public, anon;
grant select on public.dish_ratings to authenticated;
