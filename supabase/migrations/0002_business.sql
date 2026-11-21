-- Règles métier exécutées côté serveur : l'app appelle ces fonctions (rpc) au lieu d'écrire dans les tables.
-- Fuseau : Abidjan (UTC+0). Les montants sont en crédits (1 crédit = 1 F CFA).

create or replace function public.local_now() returns timestamp
language sql stable as $$ select (now() at time zone 'Africa/Abidjan') $$;

-- Une commande est possible pour un jour futur, ou aujourd'hui avant l'heure limite.
create or replace function public.is_open(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select p_day > public.local_now()::date
      or (p_day = public.local_now()::date
          and extract(hour from public.local_now()) * 60 + extract(minute from public.local_now())
              < (select cutoff_minutes from public.settings where id = 1))
$$;

-- ---------- Commander : vérifie menu, heure limite, un plat par catégorie, puis débite (ou crédit d'urgence).
create or replace function public.place_order(p_dish text, p_day date, p_removed text[] default '{}')
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d public.dishes;
  s public.settings;
  w public.wallets;
  v_price integer;
  v_fee integer := 0;
  v_credit boolean := false;
  o public.orders;
begin
  if public.my_role() <> 'student' then raise exception 'only_students'; end if;
  select * into d from public.dishes where id = p_dish and active;
  if not found then raise exception 'unknown_dish'; end if;
  if not exists (select 1 from public.menu_items where day = p_day and dish_id = p_dish and published) then
    raise exception 'not_on_menu';
  end if;
  if not public.is_open(p_day) then raise exception 'closed'; end if;
  if exists (select 1 from public.orders o2 join public.dishes d2 on d2.id = o2.dish_id
             where o2.student_id = me and o2.day = p_day and o2.status <> 'cancelled' and d2.cat = d.cat) then
    raise exception 'category_taken';
  end if;

  select * into s from public.settings where id = 1;
  v_price := d.price;
  if d.cat = 'main' and exists (select 1 from public.subscriptions where student_id = me and current_date between starts_on and ends_on) then
    v_price := least(d.price, s.promo_dish_price);
  end if;

  select * into w from public.wallets where student_id = me for update;
  if not found then insert into public.wallets (student_id) values (me) returning * into w; end if;

  if w.balance >= v_price then
    update public.wallets set balance = balance - v_price where student_id = me;
  elsif w.credit_count < s.max_credit then
    v_credit := true;
    v_fee := case when w.credit_count = 0 then 0 else round(v_price * s.credit_fee_rate) end;
    update public.wallets set debt = debt + v_price + v_fee, credit_count = credit_count + 1 where student_id = me;
  else
    raise exception 'credit_limit';
  end if;

  insert into public.orders (student_id, dish_id, day, removed, price, fee, on_credit)
  values (me, p_dish, p_day, coalesce(p_removed, '{}'), v_price, v_fee, v_credit) returning * into o;
  insert into public.wallet_transactions (student_id, kind, amount, credit, dish_id)
  values (me, 'order', -(v_price + v_fee), v_credit, p_dish);
  update public.proposals set status = 'accepted' where student_id = me and dish_id = p_dish and day = p_day and status = 'pending';
  return o;
end $$;

-- ---------- Annuler avant l'heure limite : rembourse le solde ou efface la dette correspondante.
create or replace function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and student_id = auth.uid() and status = 'ordered' for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_open(o.day) then raise exception 'closed'; end if;
  update public.orders set status = 'cancelled' where id = o.id;
  if o.on_credit then
    update public.wallets set debt = greatest(0, debt - o.price - o.fee), credit_count = greatest(0, credit_count - 1) where student_id = o.student_id;
  else
    update public.wallets set balance = balance + o.price where student_id = o.student_id;
  end if;
  insert into public.wallet_transactions (student_id, kind, amount, credit, dish_id)
  values (o.student_id, 'refund', o.price + o.fee, o.on_credit, o.dish_id);
end $$;

-- ---------- Retrait : l'élève scanne le QR code unique du comptoir ; tous ses plats du jour passent en « reçu ».
-- p_scanned_at permet d'envoyer plus tard un scan fait hors connexion (il doit dater d'aujourd'hui).
create or replace function public.confirm_pickup(p_token text, p_scanned_at timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_token is distinct from (select qr_token from public.settings where id = 1) then raise exception 'bad_qr'; end if;
  update public.orders set status = 'received', received_at = p_scanned_at
   where student_id = auth.uid() and status = 'ordered' and day = (p_scanned_at at time zone 'Africa/Abidjan')::date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Avis 👍 / 👎 : retoucher le même pouce retire l'avis.
create or replace function public.rate_order(p_order uuid, p_vote smallint, p_comment text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set vote = case when vote = p_vote and p_comment is null then null else p_vote end,
         comment = case when vote = p_vote and p_comment is null then null else coalesce(p_comment, comment) end
   where id = p_order and student_id = auth.uid() and status = 'received';
end $$;

-- ---------- Créditer un wallet après un paiement confirmé (appelé uniquement par le webhook Jèko, rôle service).
-- La dette de dépannage est remboursée en premier.
create or replace function public.credit_wallet(p_student uuid, p_amount integer, p_payment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare w public.wallets; v_pay integer;
begin
  select * into w from public.wallets where student_id = p_student for update;
  if not found then insert into public.wallets (student_id) values (p_student) returning * into w; end if;
  v_pay := least(p_amount, w.debt);
  update public.wallets
     set debt = debt - v_pay,
         balance = balance + p_amount - v_pay,
         credit_count = case when debt - v_pay = 0 then 0 else credit_count end
   where student_id = p_student;
  insert into public.wallet_transactions (student_id, kind, amount, payment_id) values (p_student, 'topup', p_amount, p_payment);
  if v_pay > 0 then
    insert into public.wallet_transactions (student_id, kind, amount, payment_id) values (p_student, 'debt', -v_pay, p_payment);
  end if;
end $$;
revoke execute on function public.credit_wallet(uuid, integer, uuid) from public, anon, authenticated;

-- ---------- Admin : nouveau QR code, signalement « plat non reçu » remboursé.
create or replace function public.regenerate_qr() returns text
language plpgsql security definer set search_path = public as $$
declare t text := 'VATEL-RETRAIT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  update public.settings set qr_token = t, qr_generated_at = now() where id = 1;
  return t;
end $$;

create or replace function public.refund_issue(p_issue uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.issues; o public.orders;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into i from public.issues where id = p_issue and status = 'open' for update;
  if not found then raise exception 'not_found'; end if;
  select * into o from public.orders where id = i.order_id;
  if found then
    update public.wallets set balance = balance + o.price where student_id = o.student_id;
    insert into public.wallet_transactions (student_id, kind, amount, dish_id) values (o.student_id, 'refund', o.price, o.dish_id);
  end if;
  update public.issues set status = 'refunded' where id = p_issue;
end $$;

-- L'élève signale un plat non reçu.
create or replace function public.report_issue(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and student_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  insert into public.issues (order_id, student_id, dish_id) values (o.id, o.student_id, o.dish_id);
end $$;

-- ---------- Stock : un achat augmente le stock, une consommation le baisse.
create or replace function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare sign integer := case when tg_table_name = 'purchases' then 1 else -1 end;
begin
  if tg_op = 'INSERT' and new.ingredient_id is not null then
    update public.ingredients set stock = greatest(0, stock + sign * new.qty) where id = new.ingredient_id;
  elsif tg_op = 'DELETE' and old.ingredient_id is not null then
    update public.ingredients set stock = greatest(0, stock - sign * old.qty) where id = old.ingredient_id;
  end if;
  return coalesce(new, old);
end $$;
create trigger purchases_stock after insert or delete on public.purchases for each row execute function public.apply_stock_movement();
create trigger usages_stock after insert or delete on public.usages for each row execute function public.apply_stock_movement();

-- ---------- Nouveau profil élève : un wallet vide est créé automatiquement.
create or replace function public.create_wallet() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'student' then insert into public.wallets (student_id) values (new.id) on conflict do nothing; end if;
  return new;
end $$;
create trigger profiles_wallet after insert on public.profiles for each row execute function public.create_wallet();

-- Les fonctions internes ne sont pas appelables depuis l'app.
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;
revoke execute on function public.create_wallet() from public, anon, authenticated;
