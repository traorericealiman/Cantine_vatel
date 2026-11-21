-- Nombre de pouces en haut et en bas par plat, visible par les utilisateurs connectés (aucune donnée personnelle).
create or replace function public.dish_thumbs()
returns table (dish_id text, up integer, down integer)
language sql stable security definer set search_path = public as $$
  select o.dish_id,
         (count(*) filter (where o.vote = 1))::integer,
         (count(*) filter (where o.vote = -1))::integer
    from public.orders o
   where o.vote is not null
   group by o.dish_id
$$;

revoke execute on function public.dish_thumbs() from public, anon;
grant execute on function public.dish_thumbs() to authenticated;
