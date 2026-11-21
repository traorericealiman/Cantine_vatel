-- Durcissement de la sécurité (audit du linter Supabase) :
-- 1) la vue SECURITY DEFINER dish_ratings devient une fonction qui ne renvoie que des totaux ;
-- 2) mode démonstration : demo_topup / demo_subscribe refusent d'agir si settings.demo_mode est faux (à désactiver en production) ;
-- 3) le retrait assoupli (plat appelé un autre jour) n'existe qu'en mode démonstration.
drop view if exists public.dish_ratings;
create or replace function public.dish_ratings() returns table (dish_id text, votes integer, likes integer)
language sql stable security definer set search_path = public as $$
  select dish_id,
         (count(*) filter (where vote is not null))::int,
         coalesce(round(100.0 * count(*) filter (where vote = 1) / nullif(count(*) filter (where vote is not null), 0)), 0)::int
    from public.orders group by dish_id
$$;
revoke execute on function public.dish_ratings() from public, anon;
grant execute on function public.dish_ratings() to authenticated;

alter table public.settings add column if not exists demo_mode boolean not null default true;
grant select (demo_mode) on public.settings to authenticated;

create or replace function public.demo_topup(p_student uuid, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (select demo_mode from public.settings where id = 1) then raise exception 'demo_disabled'; end if;
  if not public.can_see_student(p_student) then raise exception 'forbidden'; end if;
  if p_amount < 100 or p_amount > 100000 then raise exception 'bad_amount'; end if;
  perform public.credit_wallet(p_student, p_amount, null);
end $$;

create or replace function public.demo_subscribe(p_student uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (select demo_mode from public.settings where id = 1) then raise exception 'demo_disabled'; end if;
  if not public.can_see_student(p_student) then raise exception 'forbidden'; end if;
  insert into public.subscriptions (student_id) values (p_student)
  on conflict (student_id) do update set starts_on = current_date, ends_on = (current_date + interval '1 year')::date;
end $$;

create or replace function public.confirm_pickup(p_token text, p_scanned_at timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer; demo boolean;
begin
  if p_token is distinct from (select qr_token from public.settings where id = 1) then raise exception 'bad_qr'; end if;
  select demo_mode into demo from public.settings where id = 1;
  update public.orders o set status = 'received', received_at = p_scanned_at
   where o.student_id = auth.uid() and o.status = 'ordered'
     and (o.day = (p_scanned_at at time zone 'Africa/Abidjan')::date
          or (demo and exists (select 1 from public.service_calls sc where sc.day = o.day and sc.dish_id = o.dish_id and sc.called_at is not null)));
  get diagnostics n = row_count;
  return n;
end $$;
