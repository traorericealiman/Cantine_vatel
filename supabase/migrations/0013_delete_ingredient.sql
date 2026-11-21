-- Supprimer un ingrédient : son historique d'achats et de consommation est gardé (le nom reste dans le journal),
-- sa recette disparaît avec lui.
create or replace function public.delete_ingredient(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  update public.purchases set ingredient_id = null where ingredient_id = p_id;
  update public.usages set ingredient_id = null where ingredient_id = p_id;
  delete from public.ingredients where id = p_id;
end $$;
revoke execute on function public.delete_ingredient(text) from public, anon;
grant execute on function public.delete_ingredient(text) to authenticated;
