import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Reveal, Tap } from '../../components/fx';
import { BellButton, ProfileButton, ProposalButtons } from '../../components/notifications';
import { Availability, Price, Thumbs, useDiscountPct } from '../../components/price';
import { WalletCard } from '../../components/WalletCard';
import { Card, DishPhoto, DishTile, LangPill, Screen, T } from '../../components/ui';
import { DISHES, Dish, dateKey, discounted, dishById, isOpen, menuFor, remaining, serviceDays } from '../../lib/data';
import { Key, cap, compName, dayNumber, dishName, longDay, money, shortDay } from '../../lib/i18n';
import { colors, radius, shadow } from '../../lib/theme';
import { allergyHits, categoryTaken, useApp, useI18n } from '../../store/app';

const openDish = (id: string, date: string) => router.push(`/dish/${id}?date=${date}` as any);

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 14 }}>
      <T v="title2">{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <T v="subhead" weight="600" color={colors.brandText}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** En haut : le nom de la cantine, la langue (pastille FR | EN) et les notifications. */
function TopRow() {
  return (
    <Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LangPill />
          <BellButton />
          <ProfileButton />
        </View>
      </View>
    </Reveal>
  );
}

function Confirmations() {
  const { t, lang } = useI18n();
  const pct = useDiscountPct();
  const proposals = useApp((s) => s.proposals);
  const rules = useApp((s) => s.rules);
  const orders = useApp((s) => s.orders);
  // Jamais de proposition pour un plat (ou une catégorie) déjà commandé ce jour-là.
  const pending = proposals.filter((p) => p.status === 'pending' && rules.find((r) => r.id === p.ruleId)?.ask && !orders.some((o) => o.date === p.date && dishById(o.dishId).cat === dishById(p.dishId).cat));
  if (!pending.length) return null;
  return (
    <Reveal delay={150}>
      <SectionHead title={t('toConfirm')} />
      {pending.map((p) => {
        const dish = DISHES.find((d) => d.id === p.dishId)!;
        return (
          <Card key={p.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DishTile emoji={dish.emoji} id={dish.id} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <T v="headline">{dishName(dish, lang)}</T>
                <T v="subhead" color={colors.muted}>
                  {cap(longDay(p.date, lang))} · {money(discounted(dish.price, pct))}
                </T>
              </View>
            </View>
            <ProposalButtons id={p.id} />
          </Card>
        );
      })}
    </Reveal>
  );
}

/**
 * Plats conseillés : uniquement des plats que l'élève aime déjà, sans aucune allergie.
 * - Montrés : un plat qu'il a bien noté (👍), qu'il prend régulièrement (au moins 2 fois) ou qu'il a mis en favori.
 * - Jamais montrés : un plat dont sa dernière note est 👎, un plat avec un allergène (cases ou saisie libre),
 *   un plat déjà pris ce jour-là.
 * - Classement : plus il l'a commandé et aimé, plus il monte ; les ingrédients qu'il aime comptent aussi.
 */
function Recommendations() {
  const { t, lang } = useI18n();
  // Les quantités arrivent avec `called` : on se réaffiche dès qu'elles sont reçues.
  useApp((s) => s.called);
  const pct = useDiscountPct();
  const orders = useApp((s) => s.orders);
  const rules = useApp((s) => s.rules);
  const allergies = useApp((s) => s.allergies);
  const custom = useApp((s) => s.customAllergies);

  const { picks } = useMemo(() => {
    // Profil de goût : poids de chaque ingrédient d'après les plats déjà commandés / aimés.
    const taste = new Map<string, number>();
    orders.forEach((o) => {
      const w = 1 + (o.vote === 1 ? 2 : 0) - (o.vote === -1 ? 3 : 0);
      dishById(o.dishId).components.forEach((c) => taste.set(c.id, (taste.get(c.id) ?? 0) + w));
    });
    const score = (dish: Dish) => {
      const mine = orders.filter((o) => o.dishId === dish.id);
      const fav = rules.find((r) => r.dishId === dish.id);
      let sc = 20 * mine.length;
      sc += 25 * mine.filter((o) => o.vote === 1).length;
      sc -= 60 * mine.filter((o) => o.vote === -1).length;
      if (fav) sc += fav.active || fav.ask ? 40 : 30;
      sc += Math.min(30, dish.components.reduce((n, c) => n + Math.max(0, taste.get(c.id) ?? 0), 0) * 2);
      if (dish.votes > 0) sc += dish.likes * 0.2;
      return sc;
    };

    const out = new Map<string, { dish: Dish; date: string }>();
    // Repli quand l'élève n'a pas encore d'habitudes (ou que tout est déjà commandé) : les plats les mieux notés.
    const fallback = new Map<string, { dish: Dish; date: string }>();
    for (const d of serviceDays().filter((x) => isOpen(x.key))) {
      for (const dish of menuFor(d.key)) {
        if (dish.cat !== 'main' || out.has(dish.id)) continue;
        if (allergyHits(dish, allergies, custom, lang).length > 0) continue;
        // Jamais un plat que l'élève a mal noté en dernier ; seulement ceux qu'il aime ou mange souvent.
        const mine = orders.filter((o) => o.dishId === dish.id);
        const voted = mine.filter((o) => o.vote).sort((x, y) => y.date.localeCompare(x.date));
        if (voted[0]?.vote === -1) continue;
        const liked = voted.some((o) => o.vote === 1);
        const regular = mine.length >= 2;
        const favorite = rules.some((r) => r.dishId === dish.id);
        if (orders.some((o) => o.dishId === dish.id && o.date === d.key)) continue;
        if (categoryTaken(orders, dish.id, d.key)) continue;
        if (remaining(d.key, dish.id) === 0) continue;
        if (!fallback.has(dish.id)) fallback.set(dish.id, { dish, date: d.key });
        if (!liked && !regular && !favorite) continue;
        out.set(dish.id, { dish, date: d.key });
      }
    }
    const mine = [...out.values()].sort((a, b) => score(b.dish) - score(a.dish)).slice(0, 4);
    if (mine.length) return { picks: mine, personal: true };
    const popular = [...fallback.values()].sort((a, b) => b.dish.likes - a.dish.likes || b.dish.votes - a.dish.votes).slice(0, 4);
    return { picks: popular, personal: false };
  }, [orders, rules, allergies, custom, lang]);

  if (!picks.length) return null;
  return (
    <Reveal delay={200}>
      <SectionHead title={t('recommendations')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={280} decelerationRate="fast" style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingTop: 4, paddingBottom: 26 }}>
        {picks.map(({ dish, date }) => (
          <Tap key={dish.id} onPress={() => openDish(dish.id, date)} scale={0.97} style={{ borderRadius: radius.xl, backgroundColor: colors.text, ...shadow, shadowOpacity: 0.24 }}>
            <View style={{ width: 266, height: 340, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.text }}>
              <DishPhoto id={dish.id} emoji={dish.emoji} height={340} radius={0} />
              <LinearGradient colors={['rgba(11,18,34,0)', 'rgba(11,18,34,0.62)', 'rgba(11,18,34,0.96)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 }} />
              {dish.votes ? (
                <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  {dish.up !== undefined ? (
                    <Thumbs up={dish.up} down={dish.down} color={colors.text} />
                  ) : (
                    <T v="caption" weight="700" color="#15803D">
                      {t('likesShort', { n: dish.likes })}
                    </T>
                  )}
                </View>
              ) : null}
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                <T v="caption" weight="600" color="rgba(255,255,255,0.88)" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {cap(longDay(date, lang).split(' ')[0].replace(',', ''))}
                </T>
                <T v="title2" color={colors.white} numberOfLines={1} style={{ marginTop: 2 }}>
                  {dishName(dish, lang)}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <View>
                    <Price amount={discounted(dish.price, pct)} list={pct > 0 ? dish.price : undefined} color={colors.white} strikeColor="rgba(255,255,255,0.7)" />
                    <Availability left={remaining(date, dish.id)} color="rgba(255,255,255,0.85)" />
                  </View>
                  <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <T v="footnote" weight="700" color={colors.text}>
                      {t('orderBtn')}
                    </T>
                  </View>
                </View>
              </View>
            </View>
          </Tap>
        ))}
      </ScrollView>
    </Reveal>
  );
}

function MenuSection() {
  const { t, lang } = useI18n();
  // Les quantités arrivent avec `called` : on se réaffiche dès qu'elles sont reçues.
  useApp((s) => s.called);
  const pct = useDiscountPct();
  const orders = useApp((s) => s.orders);
  const days = useMemo(() => serviceDays(), []);
  const firstOpen = days.find((d) => isOpen(d.key)) ?? days[0];
  const [selected, setSelected] = useState(firstOpen.key);
  const open = isOpen(selected);
  const menu = menuFor(selected);

  const groups: { key: 'starter' | 'main' | 'dessert'; label: Key }[] = [
    { key: 'starter', label: 'starter' },
    { key: 'main', label: 'main' },
    { key: 'dessert', label: 'dessert' },
  ];

  return (
    <Reveal delay={250}>
      <SectionHead title={t('menuWeek')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 8 }}>
        {days.map((d) => {
          const on = d.key === selected;
          const passed = !isOpen(d.key);
          return (
            <Tap key={d.key} onPress={() => setSelected(d.key)} scale={0.94}>
              <View
                style={{
                  width: 62,
                  paddingVertical: 12,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  backgroundColor: on ? colors.brand : colors.card,
                  borderWidth: 1,
                  borderColor: on ? colors.brand : colors.line,
                  opacity: passed && !on ? 0.5 : 1,
                  ...(on ? { shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 } : {}),
                }}
              >
                <T v="caption" weight="600" color={on ? 'rgba(255,255,255,0.7)' : colors.muted}>
                  {shortDay(d.key, lang)}
                </T>
                <T v="title2" color={on ? colors.onBrand : colors.text} style={{ marginTop: 2 }}>
                  {dayNumber(d.key)}
                </T>
              </View>
            </Tap>
          );
        })}
      </ScrollView>

      <T v="subhead" color={colors.muted} style={{ marginTop: 14 }}>
        {selected === dateKey(new Date()) ? t('today') : cap(longDay(selected, lang))}
      </T>

      {!open ? (
        <Card style={{ marginTop: 14, alignItems: 'center', paddingVertical: 28 }}>
          <T v="title2">{t('dayPassed')}</T>
        </Card>
      ) : (
        <>
          <T v="footnote" color={colors.muted} style={{ marginTop: 4 }}>
            {t('oneMealRule')}
          </T>
          {groups.map((g) => {
            const items = menu.filter((d) => d.cat === g.key);
            if (!items.length) return null;
            return (
              <View key={g.key} style={{ marginTop: 18 }}>
                <T v="footnote" weight="600" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t(g.label)}
                </T>
                {items.map((dish) => {
                  const ordered = orders.some((o) => o.dishId === dish.id && o.date === selected);
                  const left = remaining(selected, dish.id);
                  const soldOut = !ordered && left === 0;
                  const taken = !ordered && categoryTaken(orders, dish.id, selected);
                  const press = () => {
                    if (ordered) router.navigate('/(tabs)/orders' as any);
                    else if (!taken && !soldOut) openDish(dish.id, selected);
                  };
                  // Même carte photo pour tout le menu ; un peu moins haute pour les entrées et les desserts.
                  const photoH = g.key === 'main' ? 248 : 204;
                  const hasVotes = (dish.up ?? 0) + (dish.down ?? 0) > 0;
                  const label = ordered ? t('ordered') : soldOut ? t('soldOut') : taken ? t('takenShort') : t('orderBtn');
                  const labelColor = ordered ? colors.green : soldOut ? colors.red : taken ? colors.muted : colors.text;
                  return (
                    <Tap key={dish.id} onPress={press} scale={0.98} style={{ marginBottom: 16, borderRadius: radius.xl, backgroundColor: colors.text, opacity: taken || soldOut ? 0.62 : 1, ...shadow, shadowOpacity: 0.18 }}>
                      <View style={{ height: photoH, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.text }}>
                        <DishPhoto id={dish.id} emoji={dish.emoji} height={photoH} radius={0} />
                        <LinearGradient colors={['rgba(11,18,34,0)', 'rgba(11,18,34,0.6)', 'rgba(11,18,34,0.96)']} locations={[0, 0.48, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(photoH * 0.75) }} />
                        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          {hasVotes ? (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 }}>
                              <Thumbs up={dish.up} down={dish.down} color={colors.text} />
                            </View>
                          ) : (
                            <View />
                          )}
                          {left !== null && left > 0 ? (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 11, paddingTop: 3, paddingBottom: 5 }}>
                              <Availability left={left} color={left <= 3 ? colors.warm : colors.text} />
                            </View>
                          ) : null}
                        </View>
                        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 15 }}>
                          <T v="title2" color={colors.white} numberOfLines={1}>
                            {dishName(dish, lang)}
                          </T>
                          <T v="footnote" color="rgba(255,255,255,0.88)" numberOfLines={1} style={{ marginTop: 2 }}>
                            {dish.components.map((c) => compName(c, lang)).join(', ')}
                          </T>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <Price amount={discounted(dish.price, pct)} list={pct > 0 ? dish.price : undefined} color={colors.white} strikeColor="rgba(255,255,255,0.7)" />
                            <View style={{ backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 18, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                              <T v="subhead" weight="700" color={labelColor}>
                                {label}
                              </T>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Tap>
                  );
                })}
              </View>
            );
          })}
        </>
      )}
    </Reveal>
  );
}

export default function Home() {
  return (
    <Screen topPad={10} fixedHeader>
      <TopRow />
      <WalletCard />
      <Confirmations />
      <Recommendations />
      <MenuSection />
    </Screen>
  );
}
