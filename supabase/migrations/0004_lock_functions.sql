-- Aucune fonction n'est appelable sans être connecté ; les fonctions de l'app restent ouvertes aux comptes connectés
-- (chacune vérifie elle-même le rôle et l'identité de l'appelant).
revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_role(), public.is_admin(), public.can_see_student(uuid), public.is_open(date),
  public.place_order(text, date, text[]), public.cancel_order(uuid), public.confirm_pickup(text, timestamptz),
  public.rate_order(uuid, smallint, text), public.regenerate_qr(), public.refund_issue(uuid), public.report_issue(uuid)
  to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
