import { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '../../components/fx';
import { HeartIcon } from '../../components/icons';
import { Price, useDiscountPct } from '../../components/price';
import { Button, Check, DishPhoto, T } from '../../components/ui';
import { discounted, dishById, isOpen, remaining } from '../../lib/data';
import { allergenName, cap, compName, dishName, longDay, money } from '../../lib/i18n';
import { colors, radius, shadow } from '../../lib/theme';
import { allergyHits, categoryTaken, simulate, useApp, useI18n } from '../../store/app';

/** Section de la fiche : une bande grise la sépare de la précédente, avec un vrai titre. */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ borderTopWidth: 10, borderTopColor: colors.brandSoft, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24 }}>
      <T v="title2" style={{ fontSize: 21, lineHeight: 27 }}>
        {title}
      </T>
      {hint ? (
        <T v="callout" color={colors.subtle} style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

/** Case d'avis : grand chiffre et libellé lisible sur fond teinté. */
function VoteTile({ icon, n, label, bg, fg }: { icon: string; n: number; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 16 }}>
      <T v="title" color={fg}>
        {icon} {n}
      </T>
      <T v="subhead" weight="600" color={colors.subtle} style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
}

export default function DishScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const dish = dishById(String(id));

  const orders = useApp((s) => s.orders);
  const balance = useApp((s) => s.balance);
  const creditCount = useApp((s) => s.creditCount);
  const allergies = useApp((s) => s.allergies);
  const place = useApp((s) => s.placeOrder);
  const favorite = useApp((s) => s.rules.find((r) => r.dishId === String(id)));
  const addFavorite = useApp((s) => s.addFavorite);
  const removeRule = useApp((s) => s.removeRule);
  const customAllergies = useApp((s) => s.customAllergies);
  const orderError = useApp((s) => s.orderError);
  const pct = useDiscountPct();
  // Les quantités arrivent avec `called` : on se réaffiche dès qu'elles sont reçues.
  useApp((s) => s.called);
  const price = discounted(dish.price, pct);
  const left = date ? remaining(String(date), dish.id) : null;
  const soldOut = left === 0;

  const isTaken = (k: string) => orders.some((o) => o.dishId === dish.id && o.date === k);
  const catFull = (k: string) => categoryTaken(orders, dish.id, k);
  const canPick = (k: string) => isOpen(k) && !isTaken(k) && !catFull(k);

  // On commande pour le jour d'où l'on vient : plus de choix de jours.
  const picked: string[] = date && canPick(date) ? [date] : [];
  const [removed, setRemoved] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [errBefore, setErrBefore] = useState(0);
  const [refusal, setRefusal] = useState<string | null>(null);

  const toggleComp = (cid: string) => setRemoved((r) => (r.includes(cid) ? r.filter((x) => x !== cid) : [...r, cid]));

  const quotes = simulate(balance, creditCount, picked.map(() => price));
  const refused = quotes.some((q) => q.refused);
  const fees = quotes.reduce((s, q) => s + q.fee, 0);
  const total = quotes.reduce((s, q) => s + q.price + q.fee, 0);
  const anyCredit = quotes.some((q) => q.credit);
  const after = quotes.reduce((b, q) => (q.credit ? b : b - q.price), balance);
  const conflict = allergyHits(dish, allergies, customAllergies, lang);

  const submit = () => {
    let ok = 0;
    let lastResult = 'ok';
    setErrBefore(orderError?.at ?? 0);
    [...picked].sort().forEach((k) => {
      lastResult = place(dish.id, k, removed);
      if (lastResult === 'ok') ok++;
    });
    if (ok > 0) setDone(true);
    else {
      setRefusal(lastResult === 'soldout' ? t('soldOutMsg') : null);
      setConfirming(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <View style={{ width: 34, height: 19, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: colors.green, transform: [{ rotate: '-45deg' }, { translateY: -4 }] }} />
        </View>
        <T v="title" align="center">
          {t('ordered')}
        </T>
        <T v="body" color={colors.subtle} align="center" style={{ marginTop: 8 }}>
          {dishName(dish, lang)}
        </T>
        <T v="subhead" color={colors.subtle} align="center" style={{ marginTop: 4 }}>
          {picked.map((k) => cap(longDay(k, lang))).join(' · ')}
        </T>
        {orderError && orderError.at > errBefore && /sold_out/.test(orderError.code) ? (
          <View style={{ alignSelf: 'stretch', marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.redSoft }}>
            <T v="subhead" weight="600" color={colors.red}>
              {t('soldOutMsg')}
            </T>
          </View>
        ) : null}

        {removed.length ? (
          <View style={{ alignSelf: 'stretch', marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.brand }}>
            <T v="footnote" weight="600" color="rgba(255,255,255,0.88)">
              {t('yourDish', { dish: dishName(dish, lang) })}
            </T>
            <T v="title2" color={colors.onBrand} style={{ marginTop: 2, textTransform: 'uppercase' }}>
              {removed
                .map((r) => dish.components.find((c) => c.id === r))
                .filter(Boolean)
                .map((c) => t('without', { x: compName(c!, lang).toLowerCase() }))
                .join(' · ')}
            </T>
          </View>
        ) : null}

        <View style={{ alignSelf: 'stretch', marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <T v="subhead" weight="600">
            {t('balance')} · {money(useApp.getState().balance)}
          </T>
          <T v="subhead" weight="600" color={colors.subtle} style={{ marginTop: 6 }}>
            {t('cancelInfo')}
          </T>
          <T v="subhead" weight="600" color={colors.subtle} style={{ marginTop: 4 }}>
            {t('confirmInBell')}
          </T>
        </View>
        <View style={{ height: 28 }} />
        <Button
          label={t('tabOrders')}
          style={{ alignSelf: 'stretch' }}
          onPress={() => {
            router.dismiss();
            router.navigate('/(tabs)/orders' as any);
          }}
        />
        <Button label={t('close')} kind="ghost" onPress={() => router.dismiss()} />
      </View>
    );
  }

  const up = dish.up ?? Math.round((dish.votes * dish.likes) / 100);
  const down = dish.down ?? Math.max(0, dish.votes - up);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 220 }} showsVerticalScrollIndicator={false}>
        {/* Grande photo bord à bord, avec le retour et le cœur posés dessus */}
        <View>
          <DishPhoto id={dish.id} emoji={dish.emoji} height={390} radius={0} emojiSize={110} />
          <LinearGradient pointerEvents="none" colors={['rgba(11,18,34,0.5)', 'rgba(11,18,34,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }} />
          <View style={{ position: 'absolute', top: insets.top + 14, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tap
              onPress={() => router.dismiss()}
              scale={0.9}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow }}
            >
              <T color={colors.text} style={{ fontSize: 28, lineHeight: 30, marginTop: -3 }}>
                ‹
              </T>
            </Tap>
            <Tap
              onPress={() => (favorite ? removeRule(favorite.id) : addFavorite(dish.id))}
              scale={0.86}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: favorite ? colors.redSoft : colors.card, alignItems: 'center', justifyContent: 'center', ...shadow }}
            >
              <HeartIcon filled={!!favorite} size={22} color={favorite ? colors.red : colors.text} />
            </Tap>
          </View>
        </View>

        {/* Le contenu remonte sur la photo comme une feuille */}
        <View style={{ marginTop: -34, paddingTop: 12, borderTopLeftRadius: 34, borderTopRightRadius: 34, backgroundColor: colors.bg }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', marginBottom: 16 }} />

          {/* Essentiel : nom, jour, prix, disponibilité */}
          <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
            <T v="title">{dishName(dish, lang)}</T>
            {date ? (
              <T v="callout" weight="600" color={colors.subtle} style={{ marginTop: 4 }}>
                {cap(longDay(date, lang))}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              <Price amount={price} list={pct > 0 ? dish.price : undefined} v="title2" color={pct > 0 ? colors.green : colors.brandText} strikeColor={colors.subtle} />
              {left !== null ? (
                <View style={{ backgroundColor: soldOut ? colors.redSoft : left <= 3 ? colors.warmSoft : colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <T v="subhead" weight="700" color={soldOut ? colors.red : left <= 3 ? colors.warm : colors.text}>
                    {soldOut ? t('soldOut') : t(left === 1 ? 'availableOne' : 'availableMany', { n: left })}
                  </T>
                </View>
              ) : null}
            </View>
            {pct > 0 ? (
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7, marginTop: 12 }}>
                <T v="subhead" weight="700" color={colors.green}>
                  {t('offerReduced', { pct })}
                </T>
              </View>
            ) : null}
            {conflict.length ? (
              <View style={{ backgroundColor: colors.redSoft, borderRadius: radius.md, padding: 14, marginTop: 16 }}>
                <T v="callout" weight="600" color={colors.red}>
                  {t('allergyWarn', { list: conflict.join(', ') })}
                </T>
              </View>
            ) : null}
          </View>

          <Section title={t('detailReviews')}>
            {up + down > 0 ? (
              <>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <VoteTile icon="👍" n={up} label={t('detailLiked')} bg={colors.greenSoft} fg={colors.green} />
                  <VoteTile icon="👎" n={down} label={t('detailDisliked')} bg={colors.redSoft} fg={colors.red} />
                </View>
                <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.brandSoft, marginTop: 14 }}>
                  <View style={{ flex: up, backgroundColor: colors.green }} />
                  <View style={{ flex: down, backgroundColor: colors.red }} />
                </View>
                <T v="subhead" weight="600" color={colors.subtle} style={{ marginTop: 8 }}>
                  {t('likes', { n: Math.round((100 * up) / (up + down)) })} · {t('reviews', { n: up + down })}
                </T>
              </>
            ) : (
              <T v="callout" color={colors.subtle}>
                {t('newDishHint')}
              </T>
            )}
          </Section>

          <Section title={dish.custom ? t('customize') : t('composition')} hint={dish.custom ? t('customizeHint') : undefined}>
            {dish.components.map((c, i) => (
              <View key={c.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                {c.removable ? (
                  <Check label={compName(c, lang)} checked={!removed.includes(c.id)} onPress={() => toggleComp(c.id)} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                    <View style={{ width: 26, alignItems: 'center', marginRight: 14 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />
                    </View>
                    <T v="body">{compName(c, lang)}</T>
                  </View>
                )}
              </View>
            ))}
          </Section>

          {dish.allergens.length ? (
            <Section title={t('allergensTitle')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {dish.allergens.map((a) => (
                  <View key={a} style={{ backgroundColor: colors.warmSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <T v="subhead" weight="700" color={colors.warm}>
                      {allergenName(a, lang)}
                    </T>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      {/* barre du bas : total + bouton, puis confirmation avant le débit */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          paddingBottom: Math.max(insets.bottom, 20),
          backgroundColor: colors.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          ...shadow,
          shadowOpacity: 0.12,
        }}
      >
        {confirming ? (
          <>
            <T v="title2">{t('confirmOrderTitle')}</T>
            <T v="subhead" color={colors.subtle} style={{ marginTop: 4 }}>
              {t('confirmOrderSub')}
            </T>
            <View style={{ marginTop: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="body" color={colors.subtle}>
                  {t('total')}
                </T>
                <Price amount={total} list={pct > 0 ? total + (dish.price - price) * picked.length : undefined} />
              </View>
              {!anyCredit ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="body" color={colors.subtle}>
                    {t('balanceAfter', { amount: '' }).replace(/\s*:\s*$/, '')}
                  </T>
                  <T v="headline">{money(after)}</T>
                </View>
              ) : null}
            </View>
            {anyCredit ? (
              <View style={{ backgroundColor: colors.warmSoft, borderRadius: radius.md, padding: 12, marginTop: 12 }}>
                <T v="subhead" color={colors.warm} weight="500">
                  {fees > 0 ? t('creditNoteFee', { fee: money(fees) }) : t('creditNote1')}
                </T>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button label={t('back')} kind="soft" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
              <Button label={t('confirm')} style={{ flex: 1.4 }} onPress={submit} />
            </View>
          </>
        ) : (
          <>
            {refused ? (
              <T v="subhead" color={colors.red} weight="500" style={{ marginBottom: 10 }}>
                {t('creditLimit')}
              </T>
            ) : null}
            {soldOut || refusal ? (
              <T v="subhead" color={colors.red} weight="500" style={{ marginBottom: 10 }}>
                {t('soldOutMsg')}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View>
                <T v="subhead" weight="600" color={colors.subtle}>
                  {t('total')}
                </T>
                <Price amount={total} list={pct > 0 ? total + (dish.price - price) * picked.length : undefined} v="title2" />
              </View>
              <Button
                label={conflict.length ? t('orderBtn') + ' · ' + t('allergensTitle') : t('orderBtn')}
                style={{ flex: 1 }}
                disabled={picked.length === 0 || refused || soldOut}
                onPress={() => setConfirming(true)}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
