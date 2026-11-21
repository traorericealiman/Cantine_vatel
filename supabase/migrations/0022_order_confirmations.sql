-- Messages de confirmation dans la cloche : commande passée (hors commande automatique, qui a son propre message) et commande annulée.
do $$
declare src text;
begin
  select pg_get_functiondef('public.auto_order_dish(date,text)'::regprocedure) into src;
  src := replace(src, 'insert into public.orders (student_id, dish_id, day, price) values', 'perform set_config(''vatel.auto'', ''1'', true); insert into public.orders (student_id, dish_id, day, price) values');
  execute src;
end $$;

create or replace function public.notify_order_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
declare dname text;
begin
  if coalesce(current_setting('vatel.auto', true), '') = '1' then
    perform set_config('vatel.auto', '', true);
    return new;
  end if;
  if new.status <> 'ordered' then return new; end if;
  select fr into dname from public.dishes where id = new.dish_id;
  perform public.push_to(array[new.student_id], 'order', 'Commande confirmée',
                         dname || ' pour le ' || to_char(new.day, 'DD/MM') || ' : ' || (new.price + new.fee) || ' F.',
                         jsonb_build_object('order', new.id, 'dish', new.dish_id, 'day', new.day, 'amount', new.price + new.fee, 'credit', new.on_credit));
  return new;
end $$;
create trigger orders_confirm_notify after insert on public.orders
  for each row execute function public.notify_order_confirmed();

create or replace function public.notify_order_cancelled() returns trigger
language plpgsql security definer set search_path = public as $$
declare dname text;
begin
  if new.status = 'cancelled' and old.status = 'ordered' then
    select fr into dname from public.dishes where id = new.dish_id;
    perform public.push_to(array[new.student_id], 'order_cancelled', 'Commande annulée',
                           dname || ' : ' || (new.price + new.fee) || ' F remboursés.',
                           jsonb_build_object('dish', new.dish_id, 'day', new.day, 'amount', new.price + new.fee));
  end if;
  return new;
end $$;
create trigger orders_cancel_notify after update of status on public.orders
  for each row execute function public.notify_order_cancelled();

revoke execute on function public.notify_order_confirmed(), public.notify_order_cancelled() from public, anon, authenticated;
