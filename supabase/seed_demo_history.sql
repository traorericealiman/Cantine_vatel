-- Historique de démonstration pour les élèves de test (4 dernières semaines de classe) :
-- commandes reçues, avis 👍/👎 avec quelques commentaires, recharges et dépenses.
-- Les recharges de chaque semaine égalent les dépenses de la semaine : les soldes actuels ne changent pas.
-- À exécuter une seule fois. À supprimer avec les autres éléments de démonstration avant la production.
do $$
declare
  st record; d date; w date; dow int;
  h int; pick text; v_price int; v_cat text; v_vote smallint; v_comment text; v_id uuid;
  comments text[] := array['Très bon, portion généreuse.', 'Un peu trop salé aujourd’hui.', 'Parfait, comme d’habitude !',
                           'Le plat était bien chaud, merci.', 'Un peu froid au retrait.', 'Excellent, je recommande.',
                           'Plus de piment la prochaine fois svp.', 'Délicieux !'];
  mains text[];
  like_pct jsonb := '{"garba":90,"tcheb":85,"poulet":80,"att-poisson":75,"kedjenou":85,"sauce-graine":45,"salade":70,"soupe":75,"gateau":80,"fruits":85,"yaourt":70}';
  week_total int;
begin
  for st in select p.id, p.login from public.profiles p where p.role = 'student' and p.login in ('VAT-24-0412', 'VAT-24-0413') loop
    -- plats de résistance préférés de chaque élève (les premiers reviennent plus souvent)
    mains := case st.login when 'VAT-24-0412' then array['garba','garba','tcheb','poulet','att-poisson','garba','tcheb']
                           else array['poulet','kedjenou','poulet','sauce-graine','garba','kedjenou','poulet'] end;
    for w in select generate_series('2026-10-26'::date, '2026-11-16'::date, interval '7 days')::date loop
      week_total := 0;
      for dow in 0..4 loop
        d := w + dow;
        h := abs(hashtext(st.login || d::text));
        if (h % 100) >= (case st.login when 'VAT-24-0412' then 85 else 65 end) then continue; end if;   -- jours sans commande

        -- plat de résistance
        pick := mains[1 + (h / 7) % array_length(mains, 1)];
        for v_cat in select unnest(array['main', 'starter', 'dessert']) loop
          if v_cat = 'starter' then
            if (h / 11) % 100 >= 40 then continue; end if;
            pick := (array['salade', 'soupe'])[1 + (h / 13) % 2];
          elsif v_cat = 'dessert' then
            if (h / 17) % 100 >= 30 then continue; end if;
            pick := (array['gateau', 'fruits', 'yaourt'])[1 + (h / 19) % 3];
          end if;
          select price into v_price from public.dishes where id = pick;
          v_vote := case when (abs(hashtext(st.login || d::text || pick)) % 10) < 7
                         then case when (abs(hashtext(pick || d::text || st.login)) % 100) < (like_pct->>pick)::int then 1 else -1 end
                         else null end;
          v_comment := case when v_vote is not null and (abs(hashtext(d::text || pick || st.login)) % 100) < 18
                            then comments[1 + abs(hashtext(pick || d::text)) % array_length(comments, 1)] else null end;
          insert into public.orders (student_id, dish_id, day, price, status, received_at, vote, comment, created_at)
            values (st.id, pick, d, v_price, 'received', (d + time '12:35') at time zone 'UTC', v_vote, v_comment, (d - 1 + time '18:00') at time zone 'UTC')
            on conflict do nothing returning id into v_id;
          if v_id is not null then
            insert into public.wallet_transactions (student_id, kind, amount, dish_id, at)
              values (st.id, 'order', -v_price, pick, (d - 1 + time '18:00') at time zone 'UTC');
            week_total := week_total + v_price;
          end if;
          v_id := null;
        end loop;
      end loop;
      -- recharge du lundi : égale aux dépenses de la semaine
      if week_total > 0 then
        insert into public.wallet_transactions (student_id, kind, amount, at)
          values (st.id, 'topup', week_total, (w + time '07:30') at time zone 'UTC');
      end if;
    end loop;
  end loop;
end $$;
