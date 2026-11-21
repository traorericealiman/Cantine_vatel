-- Données de départ : réglages, plats, ingrédients, recettes, menus des 2 prochaines semaines, comptes par défaut.
-- Connexion : l'app transforme l'identifiant en adresse technique « <identifiant en minuscules>@vatel.local ».
-- Comptes par défaut (mots de passe à changer à la première connexion) :
--   élève  VAT-24-0412 (Aya Koffi)    mot de passe : CHANGE_ME
--   élève  VAT-24-0413 (Kevin Koffi)  mot de passe : CHANGE_ME
--   parent parent.koffi (Marie Koffi, parent d'Aya et de Kevin) mot de passe : CHANGE_ME
--   admin  admin (Awa Traoré)         mot de passe : CHANGE_ME

insert into public.settings (id) values (1) on conflict do nothing;

-- ---------- Plats
insert into public.dishes (id, fr, en, cat, price, emoji, custom, components, allergens) values
('salade', 'Salade de crudités', 'Fresh vegetable salad', 'starter', 400, '🥗', false,
 '[{"id":"tomate","fr":"Tomate","en":"Tomato"},{"id":"concombre","fr":"Concombre","en":"Cucumber"},{"id":"carotte","fr":"Carotte","en":"Carrot"},{"id":"vinaigrette","fr":"Vinaigrette","en":"Vinaigrette"}]', '{}'),
('soupe', 'Soupe de poisson', 'Fish soup', 'starter', 500, '🥣', false,
 '[{"id":"poisson","fr":"Poisson","en":"Fish"},{"id":"legumes","fr":"Légumes","en":"Vegetables"},{"id":"piment","fr":"Piment","en":"Chili"}]', '{fish}'),
('garba', 'Garba', 'Garba', 'main', 1000, '🍛', true,
 '[{"id":"attieke","fr":"Attiéké","en":"Cassava couscous"},{"id":"thon","fr":"Thon frit","en":"Fried tuna"},{"id":"oignon","fr":"Oignon","en":"Onion","removable":true},{"id":"tomate","fr":"Tomate","en":"Tomato","removable":true},{"id":"piment","fr":"Piment","en":"Chili","removable":true},{"id":"citron","fr":"Citron","en":"Lemon","removable":true}]', '{fish}'),
('att-poisson', 'Attiéké poisson', 'Attiéké with fish', 'main', 1000, '🐟', true,
 '[{"id":"attieke","fr":"Attiéké","en":"Cassava couscous"},{"id":"poisson","fr":"Poisson braisé","en":"Grilled fish"},{"id":"oignon","fr":"Oignon","en":"Onion","removable":true},{"id":"tomate","fr":"Tomate","en":"Tomato","removable":true},{"id":"piment","fr":"Piment","en":"Chili","removable":true}]', '{fish}'),
('tcheb', 'Tchèp', 'Tchèp (rice and fish)', 'main', 1000, '🍚', false,
 '[{"id":"riz","fr":"Riz","en":"Rice"},{"id":"poisson","fr":"Poisson","en":"Fish"},{"id":"legumes","fr":"Légumes","en":"Vegetables"},{"id":"sauce","fr":"Sauce tomate","en":"Tomato sauce"}]', '{fish}'),
('kedjenou', 'Kedjenou de poulet', 'Chicken kedjenou', 'main', 1200, '🍲', true,
 '[{"id":"poulet","fr":"Poulet","en":"Chicken"},{"id":"aubergine","fr":"Aubergine","en":"Eggplant"},{"id":"tomate","fr":"Tomate","en":"Tomato"},{"id":"oignon","fr":"Oignon","en":"Onion","removable":true},{"id":"piment","fr":"Piment","en":"Chili","removable":true}]', '{}'),
('sauce-graine', 'Riz sauce graine', 'Rice with palm nut sauce', 'main', 1100, '🍲', false,
 '[{"id":"riz","fr":"Riz","en":"Rice"},{"id":"graine","fr":"Sauce graine","en":"Palm nut sauce"},{"id":"viande","fr":"Viande","en":"Meat"}]', '{}'),
('poulet', 'Poulet braisé alloco', 'Grilled chicken with plantain', 'main', 1200, '🍗', true,
 '[{"id":"poulet","fr":"Poulet braisé","en":"Grilled chicken"},{"id":"alloco","fr":"Alloco","en":"Fried plantain"},{"id":"oignon","fr":"Oignon","en":"Onion","removable":true},{"id":"piment","fr":"Piment","en":"Chili","removable":true}]', '{}'),
('gateau', 'Gâteau à la noix de coco', 'Coconut cake', 'dessert', 300, '🍰', false,
 '[{"id":"coco","fr":"Noix de coco","en":"Coconut"},{"id":"farine","fr":"Farine","en":"Flour"}]', '{gluten,egg,milk}'),
('fruits', 'Salade de fruits', 'Fruit salad', 'dessert', 300, '🍉', false,
 '[{"id":"ananas","fr":"Ananas","en":"Pineapple"},{"id":"papaye","fr":"Papaye","en":"Papaya"},{"id":"orange","fr":"Orange","en":"Orange"}]', '{}'),
('yaourt', 'Yaourt local', 'Local yoghurt', 'dessert', 250, '🥛', false,
 '[{"id":"lait","fr":"Lait","en":"Milk"},{"id":"sucre","fr":"Sucre","en":"Sugar"}]', '{milk}')
on conflict (id) do nothing;

-- ---------- Ingrédients et recettes (quantité par portion, utile aux prévisions d'achat)
insert into public.ingredients (id, fr, en, unit, stock, threshold, price) values
('attieke', 'Attiéké', 'Attiéké', 'kg', 120, 60, 600),
('riz', 'Riz', 'Rice', 'kg', 210, 100, 550),
('thon', 'Thon', 'Tuna', 'kg', 18, 25, 2800),
('poisson', 'Poisson frais', 'Fresh fish', 'kg', 45, 40, 2500),
('poulet', 'Poulet', 'Chicken', 'kg', 32, 40, 2200),
('plantain', 'Banane plantain', 'Plantain', 'régimes', 40, 30, 3000),
('oignon', 'Oignon', 'Onion', 'kg', 25, 15, 700),
('tomate', 'Tomate', 'Tomato', 'kg', 14, 20, 900),
('graine', 'Graine de palme', 'Palm nut', 'kg', 22, 15, 1200),
('huile', 'Huile', 'Oil', 'L', 60, 30, 1300)
on conflict (id) do nothing;

insert into public.recipes (dish_id, ingredient_id, qty_per_portion) values
('garba', 'attieke', 0.25), ('garba', 'thon', 0.12), ('garba', 'oignon', 0.03), ('garba', 'tomate', 0.04), ('garba', 'huile', 0.03),
('att-poisson', 'attieke', 0.25), ('att-poisson', 'poisson', 0.2), ('att-poisson', 'oignon', 0.03), ('att-poisson', 'tomate', 0.04),
('tcheb', 'riz', 0.2), ('tcheb', 'poisson', 0.15), ('tcheb', 'tomate', 0.05), ('tcheb', 'huile', 0.03),
('sauce-graine', 'riz', 0.2), ('sauce-graine', 'graine', 0.15),
('poulet', 'poulet', 0.3), ('poulet', 'plantain', 0.08), ('poulet', 'oignon', 0.03), ('poulet', 'huile', 0.04),
('kedjenou', 'poulet', 0.3), ('kedjenou', 'tomate', 0.05), ('kedjenou', 'oignon', 0.03),
('soupe', 'poisson', 0.1), ('salade', 'tomate', 0.06)
on conflict do nothing;

-- ---------- Menus publiés pour les 14 prochains jours d'école (même rotation que l'app)
with days as (
  select d::date as day, extract(isodow from d)::int as dow
  from generate_series((now() at time zone 'Africa/Abidjan')::date, (now() at time zone 'Africa/Abidjan')::date + 20, interval '1 day') d
  where extract(isodow from d) between 1 and 5
), rotation(dow, items) as (values
  (1, array['salade', 'tcheb', 'att-poisson', 'poulet', 'gateau']),
  (2, array['soupe', 'garba', 'sauce-graine', 'kedjenou', 'fruits']),
  (3, array['salade', 'tcheb', 'att-poisson', 'sauce-graine', 'yaourt']),
  (4, array['soupe', 'garba', 'poulet', 'tcheb', 'gateau']),
  (5, array['salade', 'att-poisson', 'garba', 'sauce-graine', 'fruits'])
)
insert into public.menu_items (day, slot, dish_id, published)
select days.day,
       case when i = 1 then 'starter0' when i = 5 then 'dessert0' else 'main' || (i - 2) end,
       rotation.items[i], true
from days join rotation using (dow), generate_series(1, 5) i
on conflict do nothing;

-- ---------- Comptes par défaut (Supabase Auth + profils)
create or replace function public._seed_user(p_login text, p_password text, p_role text, p_full text, p_first text, p_class text default null)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid; v_email text := lower(p_login) || '@vatel.local';
begin
  select id into uid from auth.users where email = v_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', v_email,
            crypt(p_password, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('login', p_login), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;
  insert into public.profiles (id, role, login, full_name, first_name, class_name, allergies_done)
  values (uid, p_role, p_login, p_full, p_first, p_class, p_role <> 'student')
  on conflict (id) do nothing;
  return uid;
end $$;

do $$
declare aya uuid; kevin uuid; marie uuid;
begin
  aya := public._seed_user('VAT-24-0412', 'CHANGE_ME', 'student', 'Aya Koffi', 'Aya', 'Bachelor 2');
  kevin := public._seed_user('VAT-24-0413', 'CHANGE_ME', 'student', 'Kevin Koffi', 'Kevin', 'Bachelor 1');
  marie := public._seed_user('parent.koffi', 'CHANGE_ME', 'parent', 'Marie Koffi', 'Marie');
  perform public._seed_user('admin', 'CHANGE_ME', 'admin', 'Awa Traoré', 'Awa');
  insert into public.parent_links values (marie, aya), (marie, kevin) on conflict do nothing;
  -- Les élèves démarrent à zéro : le solde ne bouge qu'après une recharge.
end $$;

drop function public._seed_user(text, text, text, text, text, text);
