-- Les favoris gardent un ordre stable (date d'ajout) : ils ne changent plus de place quand on modifie le mode.
alter table public.favorites add column if not exists created_at timestamptz not null default now();
