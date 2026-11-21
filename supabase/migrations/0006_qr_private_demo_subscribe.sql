-- Le jeton du QR code ne doit pas être lisible par les élèves : lecture des réglages sans cette colonne.
revoke select on public.settings from authenticated, anon;
grant select (id, cutoff_minutes, standard_price, promo_dish_price, promo_fee, credit_fee_rate, max_credit, service_mode, qr_generated_at)
  on public.settings to authenticated;

create or replace function public.admin_qr() returns table (token text, generated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  return query select qr_token, qr_generated_at from public.settings where id = 1;
end $$;
revoke execute on function public.admin_qr() from public, anon;
grant execute on function public.admin_qr() to authenticated;

-- Abonnement de démonstration (sans paiement). À SUPPRIMER avant la mise en production.
create or replace function public.demo_subscribe(p_student uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_see_student(p_student) then raise exception 'forbidden'; end if;
  insert into public.subscriptions (student_id) values (p_student)
  on conflict (student_id) do update set starts_on = current_date, ends_on = (current_date + interval '1 year')::date;
end $$;
revoke execute on function public.demo_subscribe(uuid) from public, anon;
grant execute on function public.demo_subscribe(uuid) to authenticated;
