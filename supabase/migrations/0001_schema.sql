-- Cantine de Vatel : schéma de base (élèves, parents, administrateurs).
-- Les montants sont en crédits : 1 crédit = 1 F CFA, entiers.

create extension if not exists pgcrypto;

-- ---------- Profils (un par compte Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'parent', 'admin')),
  login text not null unique,               -- matricule (élève) ou identifiant (parent, admin)
  full_name text not null,
  first_name text not null,
  class_name text,
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  must_change_password boolean not null default true,
  allergies text[] not null default '{}',
  custom_allergies text[] not null default '{}',
  allergies_done boolean not null default false,
  low_threshold integer not null default 2000,
  app_vote smallint check (app_vote in (-1, 1)),
  created_at timestamptz not null default now()
);

create table public.parent_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- ---------- Wallet (crédits) et opérations
create table public.wallets (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  debt integer not null default 0 check (debt >= 0),
  credit_count integer not null default 0 check (credit_count between 0 and 3)
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('topup', 'order', 'refund', 'debt', 'subscription')),
  amount integer not null,                  -- + entrée, - sortie
  credit boolean not null default false,
  dish_id text,
  payment_id uuid,
  at timestamptz not null default now()
);
create index on public.wallet_transactions (student_id, at desc);

-- ---------- Plats, recettes, menus
create table public.dishes (
  id text primary key,
  fr text not null,
  en text not null,
  cat text not null check (cat in ('starter', 'main', 'dessert')),
  price integer not null check (price > 0),
  emoji text not null default '🍽️',
  custom boolean not null default false,
  components jsonb not null default '[]',  -- [{id, fr, en, removable}]
  allergens text[] not null default '{}',
  image text,                               -- nom de fichier local ou URL
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id text primary key,
  fr text not null,
  en text not null,
  unit text not null,
  stock numeric not null default 0,
  threshold numeric not null default 0,
  price integer not null default 0          -- prix moyen par unité
);

create table public.recipes (
  dish_id text not null references public.dishes(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id) on delete cascade,
  qty_per_portion numeric not null check (qty_per_portion > 0),
  primary key (dish_id, ingredient_id)
);

create table public.menu_items (
  day date not null,
  slot text not null,                       -- ex. starter0, main1
  dish_id text not null references public.dishes(id),
  published boolean not null default false,
  primary key (day, slot)
);

-- ---------- Réglages (une seule ligne)
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  cutoff_minutes integer not null default 600 check (cutoff_minutes between 420 and 840),
  standard_price integer not null default 1000,
  promo_dish_price integer not null default 800,
  promo_fee integer not null default 20000,
  credit_fee_rate numeric not null default 0.1,
  max_credit integer not null default 3,
  service_mode text not null default 'call' check (service_mode in ('call', 'tables')),
  qr_token text not null default ('VATEL-RETRAIT-' || upper(substr(md5(random()::text), 1, 6))),
  qr_generated_at timestamptz not null default now()
);

-- ---------- Commandes, avis, favoris, propositions, signalements
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  dish_id text not null references public.dishes(id),
  day date not null,
  removed text[] not null default '{}',
  price integer not null,
  fee integer not null default 0,
  on_credit boolean not null default false,
  status text not null default 'ordered' check (status in ('ordered', 'received', 'cancelled')),
  received_at timestamptz,
  vote smallint check (vote in (-1, 1)),
  comment text,
  created_at timestamptz not null default now()
);
create unique index orders_one_per_dish on public.orders (student_id, dish_id, day) where status <> 'cancelled';
create index on public.orders (day, dish_id);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  dish_id text not null references public.dishes(id) on delete cascade,
  auto_order boolean not null default false,
  unique (student_id, dish_id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  favorite_id uuid references public.favorites(id) on delete cascade,
  dish_id text not null references public.dishes(id),
  day date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (student_id, dish_id, day)
);

create table public.service_calls (
  day date not null,
  dish_id text not null references public.dishes(id),
  table_letter text,
  called_at timestamptz,
  primary key (day, dish_id)
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  dish_id text not null references public.dishes(id),
  status text not null default 'open' check (status in ('open', 'refunded', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------- Stock : achats et consommation
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text references public.ingredients(id),
  name text not null,
  qty numeric not null check (qty > 0),
  unit text not null,
  amount integer not null check (amount >= 0),
  supplier text not null default '',
  used_for text[] not null default '{}',
  note text not null default '',
  at timestamptz not null default now()
);

create table public.usages (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text references public.ingredients(id),
  name text not null,
  qty numeric not null check (qty > 0),
  unit text not null,
  used_for text[] not null default '{}',
  note text not null default '',
  at timestamptz not null default now()
);

create table public.inventory_weeks (
  week_start date primary key,
  validated_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id)
);

-- ---------- Paiements (Jèko) et abonnements
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.profiles(id),
  student_id uuid not null references public.profiles(id),
  purpose text not null default 'topup' check (purpose in ('topup', 'subscription')),
  amount integer not null check (amount >= 100),
  method text not null check (method in ('wave', 'orange', 'mtn', 'moov', 'djamo')),
  payer_phone text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'expired')),
  reference text not null unique,
  jeko_id text unique,
  redirect_url text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.subscriptions (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date not null default (current_date + interval '1 year')::date,
  payment_id uuid references public.payments(id)
);

-- ---------- Notifications (jetons Expo et historique)
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ======================================================================
-- Sécurité : fonctions d'aide et règles par ligne (RLS)
-- ======================================================================
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = sid
      or public.is_admin()
      or exists (select 1 from public.parent_links where parent_id = auth.uid() and student_id = sid)
$$;

alter table public.profiles enable row level security;
alter table public.parent_links enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.dishes enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.menu_items enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.favorites enable row level security;
alter table public.proposals enable row level security;
alter table public.service_calls enable row level security;
alter table public.issues enable row level security;
alter table public.purchases enable row level security;
alter table public.usages enable row level security;
alter table public.inventory_weeks enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

-- Profils : chacun voit le sien ; un parent voit ses enfants ; l'admin voit tout.
create policy profiles_read on public.profiles for select using (public.can_see_student(id) or id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy links_read on public.parent_links for select using (parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy links_admin on public.parent_links for all using (public.is_admin()) with check (public.is_admin());

-- Argent : lecture seule pour l'élève et son parent ; toute écriture passe par les fonctions serveur.
create policy wallets_read on public.wallets for select using (public.can_see_student(student_id));
create policy tx_read on public.wallet_transactions for select using (public.can_see_student(student_id));

-- Catalogue : lisible par tous les connectés ; modifiable par l'admin.
create policy dishes_read on public.dishes for select to authenticated using (true);
create policy dishes_admin on public.dishes for all using (public.is_admin()) with check (public.is_admin());
create policy menu_read on public.menu_items for select to authenticated using (published or public.is_admin());
create policy menu_admin on public.menu_items for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- Commandes : lecture par l'élève, son parent, l'admin ; écriture par fonctions serveur (sauf avis).
create policy orders_read on public.orders for select using (public.can_see_student(student_id));
create policy orders_admin on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy fav_own on public.favorites for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy fav_admin_read on public.favorites for select using (public.is_admin());
create policy prop_read on public.proposals for select using (public.can_see_student(student_id));

create policy calls_read on public.service_calls for select to authenticated using (true);
create policy calls_admin on public.service_calls for all using (public.is_admin()) with check (public.is_admin());

create policy issues_read on public.issues for select using (public.can_see_student(student_id));
create policy issues_admin on public.issues for all using (public.is_admin()) with check (public.is_admin());

-- Stock : réservé à l'admin.
create policy ing_admin on public.ingredients for all using (public.is_admin()) with check (public.is_admin());
create policy rec_admin on public.recipes for all using (public.is_admin()) with check (public.is_admin());
create policy pur_admin on public.purchases for all using (public.is_admin()) with check (public.is_admin());
create policy use_admin on public.usages for all using (public.is_admin()) with check (public.is_admin());
create policy inv_admin on public.inventory_weeks for all using (public.is_admin()) with check (public.is_admin());

-- Paiements : chacun voit les siens (payeur) et ceux de ses enfants ; création par Edge Function.
create policy pay_read on public.payments for select using (payer_id = auth.uid() or public.can_see_student(student_id));
create policy sub_read on public.subscriptions for select using (public.can_see_student(student_id));

create policy push_own on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_own on public.notifications for select using (user_id = auth.uid());
create policy notif_mark_read on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
