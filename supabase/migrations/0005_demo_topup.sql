-- Recharge de démonstration (sans paiement Jèko). À SUPPRIMER avant la mise en production.
create or replace function public.demo_topup(p_student uuid, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_see_student(p_student) then raise exception 'forbidden'; end if;
  if p_amount < 100 or p_amount > 100000 then raise exception 'bad_amount'; end if;
  perform public.credit_wallet(p_student, p_amount, null);
end $$;
revoke execute on function public.demo_topup(uuid, integer) from public, anon;
grant execute on function public.demo_topup(uuid, integer) to authenticated;
