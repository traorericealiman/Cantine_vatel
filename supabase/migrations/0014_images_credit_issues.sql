-- 1) Règle du crédit d'urgence réglable par l'admin (nombre de plats et frais) : la base la lit déjà dans place_order.
alter table public.wallets drop constraint if exists wallets_credit_count_check;
alter table public.wallets add constraint wallets_credit_count_check check (credit_count between 0 and 20);
alter table public.settings add constraint settings_max_credit_check check (max_credit between 0 and 10);
alter table public.settings add constraint settings_fee_rate_check check (credit_fee_rate between 0 and 1);

-- 2) Photos des plats : bucket public « dishes », écriture réservée à l'admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dishes', 'dishes', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy dishes_img_insert on storage.objects for insert to authenticated with check (bucket_id = 'dishes' and public.is_admin());
create policy dishes_img_update on storage.objects for update to authenticated using (bucket_id = 'dishes' and public.is_admin()) with check (bucket_id = 'dishes' and public.is_admin());
create policy dishes_img_delete on storage.objects for delete to authenticated using (bucket_id = 'dishes' and public.is_admin());

-- 3) « Plat non reçu » : un seul signalement par commande reçue ; l'admin est prévenu, l'élève aussi quand c'est traité.
create or replace function public.report_issue(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and student_id = auth.uid() and status = 'received';
  if not found then raise exception 'not_found'; end if;
  if exists (select 1 from public.issues where order_id = o.id) then return; end if;
  insert into public.issues (order_id, student_id, dish_id) values (o.id, o.student_id, o.dish_id);
end $$;

create or replace function public.notify_issue() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text; admins uuid[];
begin
  select first_name || ' ' || left(split_part(full_name, ' ', 2), 1) || '.' into sname from public.profiles where id = new.student_id;
  select array_agg(id) into admins from public.profiles where role = 'admin';
  perform public.push_to(admins, 'issue', 'Plat non reçu', sname || ' signale un plat non reçu.',
                         jsonb_build_object('issue', new.id, 'dish', new.dish_id, 'name', sname));
  return new;
end $$;
create trigger issues_notify after insert on public.issues for each row execute function public.notify_issue();

create or replace function public.notify_issue_result() returns trigger
language plpgsql security definer set search_path = public as $$
declare price integer;
begin
  if new.status = old.status or new.status = 'open' then return new; end if;
  select o.price into price from public.orders o where o.id = new.order_id;
  perform public.push_to(array[new.student_id], case when new.status = 'refunded' then 'refund' else 'resolved' end,
                         'Signalement traité', 'Ton signalement a été traité.',
                         jsonb_build_object('issue', new.id, 'dish', new.dish_id, 'amount', coalesce(price, 0)));
  return new;
end $$;
create trigger issues_result_notify after update of status on public.issues for each row execute function public.notify_issue_result();

revoke execute on function public.notify_issue(), public.notify_issue_result() from public, anon, authenticated;
