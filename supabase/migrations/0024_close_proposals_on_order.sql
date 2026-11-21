-- Dès qu'un plat est commandé, les propositions en attente de la même catégorie ce jour-là sont fermées
-- (acceptée si c'est le même plat, refusée sinon) : on ne peut pas recommander le même plat en confirmant une vieille proposition.
create or replace function public.close_proposals_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare cat text;
begin
  if new.status = 'cancelled' then return new; end if;
  select d.cat into cat from public.dishes d where d.id = new.dish_id;
  update public.proposals p
     set status = case when p.dish_id = new.dish_id then 'accepted' else 'declined' end
   where p.student_id = new.student_id and p.day = new.day and p.status = 'pending'
     and (select d.cat from public.dishes d where d.id = p.dish_id) = cat;
  return new;
end $$;
create trigger orders_close_proposals after insert on public.orders
  for each row execute function public.close_proposals_on_order();
revoke execute on function public.close_proposals_on_order() from public, anon, authenticated;

update public.proposals p set status = 'declined'
 where p.status = 'pending' and exists (
   select 1 from public.orders o join public.dishes d1 on d1.id = o.dish_id join public.dishes d2 on d2.id = p.dish_id
    where o.student_id = p.student_id and o.day = p.day and o.status <> 'cancelled' and d1.cat = d2.cat);
