-- Avis sur l'application (pouce + message libre), écrits par l'élève ou le parent, lus par l'admin.
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  vote smallint check (vote in (-1, 1)),
  note text,
  created_at timestamptz not null default now()
);
alter table public.app_feedback enable row level security;
create policy fb_insert on public.app_feedback for insert to authenticated with check (user_id = auth.uid());
create policy fb_read on public.app_feedback for select to authenticated using (user_id = auth.uid() or public.is_admin());
