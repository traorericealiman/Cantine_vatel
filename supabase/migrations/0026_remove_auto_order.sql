-- La commande automatique des favoris est retirée : seul le mode « me demander » reste (proposition Oui / Non).
-- Les favoris qui étaient en automatique passent en « me demander ».
drop trigger if exists favorites_auto_order on public.favorites;
drop trigger if exists menu_items_auto_order on public.menu_items;
update public.favorites set ask = true where auto_order;
update public.favorites set auto_order = false where auto_order;
