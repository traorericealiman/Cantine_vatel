-- La cloche de l'app lit l'historique de la table notifications. Chaque événement y écrit une ligne
-- avec des données structurées (l'app compose le texte dans la langue de l'utilisateur).
alter publication supabase_realtime add table public.notifications;

-- Plat appelé (données : plat et jour)
create or replace function public.notify_called() returns trigger
language plpgsql security definer set search_path = public as $$
declare dname text; users uuid[];
begin
  if new.called_at is null or (tg_op = 'UPDATE' and old.called_at is not distinct from new.called_at) then return new; end if;
  select fr into dname from public.dishes where id = new.dish_id;
  select array_agg(distinct student_id) into users from public.orders
   where day = new.day and dish_id = new.dish_id and status = 'ordered';
  perform public.push_to(users, 'turn', 'C''est ton tour', dname || ' est prêt, passe au comptoir.',
                         jsonb_build_object('dish', new.dish_id, 'day', new.day));
  return new;
end $$;

-- Solde bas (données : solde, élève concerné et son prénom)
create or replace function public.notify_low_balance() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text; users uuid[];
begin
  if new.balance >= old.balance then return new; end if;
  select first_name into sname from public.profiles where id = new.student_id;
  select array_agg(id) into users from (
    select p.id from public.profiles p where p.id = new.student_id and old.balance >= p.low_threshold and new.balance < p.low_threshold
    union
    select p.id from public.parent_links l join public.profiles p on p.id = l.parent_id
     where l.student_id = new.student_id and old.balance >= p.low_threshold and new.balance < p.low_threshold
  ) x;
  perform public.push_to(users, 'low', 'Solde bas', 'Le solde de ' || sname || ' est de ' || new.balance || ' F.',
                         jsonb_build_object('student', new.student_id, 'name', sname, 'balance', new.balance));
  return new;
end $$;

-- Paiement reçu (données : montant)
create or replace function public.notify_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'success' and old.status is distinct from 'success' then
    perform public.push_to(
      (select array_agg(distinct u) from unnest(array[new.payer_id, new.student_id]) u),
      'payment', 'Paiement reçu', 'Ton paiement de ' || new.amount || ' F a bien été reçu.',
      jsonb_build_object('payment', new.id, 'amount', new.amount, 'student', new.student_id));
  end if;
  return new;
end $$;

-- Commande proposée (« Commander pour moi » activé sur un favori)
create or replace function public.notify_proposal() returns trigger
language plpgsql security definer set search_path = public as $$
declare dname text;
begin
  if new.status <> 'pending' then return new; end if;
  select fr into dname from public.dishes where id = new.dish_id;
  perform public.push_to(array[new.student_id], 'proposal', 'Commande proposée', dname || ' est au menu, veux-tu le commander ?',
                         jsonb_build_object('proposal', new.id, 'dish', new.dish_id, 'day', new.day));
  return new;
end $$;
create trigger proposals_notify after insert on public.proposals
  for each row execute function public.notify_proposal();

-- Plat commandé à crédit : l'élève et ses parents sont prévenus (données : plat, dette, élève)
create or replace function public.notify_credit_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text; dname text; v_debt integer; parents uuid[];
begin
  if not new.on_credit then return new; end if;
  select first_name into sname from public.profiles where id = new.student_id;
  select fr into dname from public.dishes where id = new.dish_id;
  select debt into v_debt from public.wallets where student_id = new.student_id;
  select array_agg(parent_id) into parents from public.parent_links where student_id = new.student_id;
  perform public.push_to(array[new.student_id], 'credit', 'Plat à crédit', dname || ' commandé à crédit.',
                         jsonb_build_object('order', new.id, 'dish', new.dish_id, 'debt', v_debt, 'student', new.student_id, 'name', sname));
  perform public.push_to(parents, 'credit', 'Plat à crédit', sname || ' a commandé ' || dname || ' à crédit.',
                         jsonb_build_object('order', new.id, 'dish', new.dish_id, 'debt', v_debt, 'student', new.student_id, 'name', sname));
  return new;
end $$;
create trigger orders_credit_notify after insert on public.orders
  for each row execute function public.notify_credit_order();

revoke execute on function public.notify_proposal(), public.notify_credit_order() from public, anon, authenticated;
