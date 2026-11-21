-- Notifications push : le serveur envoie les messages via le service Expo (pg_net), sans passer par l'app.
create extension if not exists pg_net with schema extensions;

-- Enregistre la notification dans l'historique et l'envoie sur les téléphones de ces utilisateurs.
create or replace function public.push_to(p_users uuid[], p_kind text, p_title text, p_body text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public, extensions as $$
declare msgs jsonb;
begin
  if p_users is null or array_length(p_users, 1) is null then return; end if;
  insert into public.notifications (user_id, kind, title, body, data)
  select u, p_kind, p_title, p_body, p_data from unnest(p_users) u;
  select jsonb_agg(jsonb_build_object('to', t.token, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default', 'channelId', 'default'))
    into msgs from public.push_tokens t where t.user_id = any(p_users);
  if msgs is not null then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := msgs,
                          headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb);
  end if;
end $$;
revoke execute on function public.push_to(uuid[], text, text, text, jsonb) from public, anon, authenticated;

-- 1) L'admin appelle un plat : les élèves qui l'ont commandé aujourd'hui sont prévenus.
create or replace function public.notify_called() returns trigger
language plpgsql security definer set search_path = public as $$
declare dname text; users uuid[];
begin
  if new.called_at is null or (tg_op = 'UPDATE' and old.called_at is not distinct from new.called_at) then return new; end if;
  select fr into dname from public.dishes where id = new.dish_id;
  select array_agg(distinct student_id) into users from public.orders
   where day = new.day and dish_id = new.dish_id and status = 'ordered';
  perform public.push_to(users, 'turn', 'C''est ton tour', dname || ' est prêt, passe au comptoir.', jsonb_build_object('dish', new.dish_id));
  return new;
end $$;
create trigger service_calls_notify after insert or update on public.service_calls
  for each row execute function public.notify_called();

-- 2) Le solde passe sous le seuil : l'élève et ses parents sont prévenus (chacun avec son propre seuil).
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
  perform public.push_to(users, 'low', 'Solde bas', 'Le solde de ' || sname || ' est de ' || new.balance || ' F. Pense à recharger.', jsonb_build_object('student', new.student_id));
  return new;
end $$;
create trigger wallets_low_notify after update of balance on public.wallets
  for each row execute function public.notify_low_balance();

-- 3) Recharge reçue : le payeur et l'élève sont prévenus.
create or replace function public.notify_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'success' and old.status is distinct from 'success' then
    perform public.push_to(
      (select array_agg(distinct u) from unnest(array[new.payer_id, new.student_id]) u),
      'payment', 'Paiement reçu', 'Ton paiement de ' || new.amount || ' F a bien été reçu.', jsonb_build_object('payment', new.id));
  end if;
  return new;
end $$;
create trigger payments_notify after update of status on public.payments
  for each row execute function public.notify_payment();

revoke execute on function public.notify_called(), public.notify_low_balance(), public.notify_payment() from public, anon, authenticated;
