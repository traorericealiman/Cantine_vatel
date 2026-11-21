-- Notifications de l'administrateur : stock bas, nouvel avis (les signalements existent déjà : 0014). Commentaires : jusqu'à 200.
create or replace function public.notify_stock_low() returns trigger
language plpgsql security definer set search_path = public as $$
declare admins uuid[];
begin
  if new.stock < new.threshold and old.stock >= old.threshold then
    select array_agg(id) into admins from public.profiles where role = 'admin';
    perform public.push_to(admins, 'stock_low', 'Stock bas', new.fr || ' est sous le seuil.',
                           jsonb_build_object('ingredient', new.id, 'name', new.fr, 'stock', new.stock, 'unit', new.unit));
  end if;
  return new;
end $$;
create trigger ingredients_low_notify after update of stock on public.ingredients
  for each row execute function public.notify_stock_low();

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare admins uuid[]; dname text;
begin
  if new.comment is not null and new.comment <> '' and new.comment is distinct from old.comment then
    select array_agg(id) into admins from public.profiles where role = 'admin';
    select fr into dname from public.dishes where id = new.dish_id;
    perform public.push_to(admins, 'comment', 'Nouvel avis', dname || ' : ' || left(new.comment, 80),
                           jsonb_build_object('dish', new.dish_id, 'vote', new.vote, 'text', left(new.comment, 120)));
  end if;
  return new;
end $$;
create trigger orders_comment_notify after update of comment on public.orders
  for each row execute function public.notify_comment();

revoke execute on function public.notify_stock_low(), public.notify_comment() from public, anon, authenticated;

drop function if exists public.admin_comments();
create or replace function public.admin_comments() returns table (dish_id text, author text, vote smallint, comment text, at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  return query
    select o.dish_id, p.first_name || ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.', o.vote, o.comment, o.created_at
      from public.orders o join public.profiles p on p.id = o.student_id
     where o.comment is not null and o.comment <> ''
     order by o.created_at desc limit 200;
end $$;
revoke execute on function public.admin_comments() from public, anon;
grant execute on function public.admin_comments() to authenticated;
