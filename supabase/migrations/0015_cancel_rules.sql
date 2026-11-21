-- Annulation : possible seulement avant l'heure limite du jour de la commande, et plus une fois le plat appelé (disponible).
create or replace function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and student_id = auth.uid() and status = 'ordered' for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_open(o.day) then raise exception 'closed'; end if;
  if exists (select 1 from public.service_calls where day = o.day and dish_id = o.dish_id and called_at is not null) then
    raise exception 'already_called';
  end if;
  update public.orders set status = 'cancelled' where id = o.id;
  if o.on_credit then
    update public.wallets set debt = greatest(0, debt - o.price - o.fee), credit_count = greatest(0, credit_count - 1) where student_id = o.student_id;
  else
    update public.wallets set balance = balance + o.price where student_id = o.student_id;
  end if;
  insert into public.wallet_transactions (student_id, kind, amount, credit, dish_id)
  values (o.student_id, 'refund', o.price + o.fee, o.on_credit, o.dish_id);
end $$;
