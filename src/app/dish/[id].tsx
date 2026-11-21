import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '../../components/fx';
import { HeartIcon } from '../../components/icons';
import { Button, Card, Check, DishPhoto, T } from '../../components/ui';
import { dishById, isOpen } from '../../lib/data';
import { allergenName, cap, compName, dishName, longDay, money } from '../../lib/i18n';
import { colors, radius, shadow } from '../../lib/theme';
import { allergyHits, categoryTaken, simulate, useApp, useI18n } from '../../store/app';

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

  const isTaken = (k: string) => orders.some((o) => o.dishId === dish.id && o.date === k);
  const catFull = (k: string) => categoryTaken(orders, dish.id, k);
  const canPick = (k: string) => isOpen(k) && !isTaken(k) && !catFull(k);

  // On commande pour le jour d'où l'on vient : plus de choix de jours.
  const picked: string[] = date && canPick(date) ? [date] : [];
  const [removed, setRemoved] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const toggleComp = (cid: string) => setRemoved((r) => (r.includes(cid) ? r.filter((x) => x !== cid) : [...r, cid]));

  const quotes = simulate(balance, creditCount, picked.map(() => dish.price));
  const refused = quotes.some((q) => q.refused);
  const fees = quotes.reduce((s, q) => s + q.fee, 0);
  const total = quotes.reduce((s, q) => s + q.price + q.fee, 0);
  const anyCredit = quotes.some((q) => q.credit);
  const after = quotes.reduce((b, q) => (q.credit ? b : b - q.price), balance);
  const conflict = allergyHits(dish, allergies, customAllergies, lang);

  const submit = () => {
    let ok = 0;
    [...picked].sort().forEach((k) => {
      if (place(dish.id, k, removed) === 'ok') ok++;
    });
    if (ok > 0) setDone(true);
    else setConfirming(false);
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
        <T v="body" color={colors.muted} align="center" style={{ marginTop: 8 }}>
          {dishName(dish, lang)}
        </T>
        <T v="subhead" color={colors.muted} align="center" style={{ marginTop: 4 }}>
          {picked.map((k) => cap(longDay(k, lang))).join(' · ')}
        </T>

        {removed.length ? (
          <View style={{ alignSelf: 'stretch', marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.brand }}>
            <T v="footnote" weight="600" color="rgba(255,255,255,0.75)">
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
          <T v="footnote" color={colors.muted} style={{ marginTop: 6 }}>
            {t('cancelInfo')}
          </T>
          <T v="footnote" color={colors.muted} style={{ marginTop: 4 }}>
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

  const description = dish.components.map((c) => compName(c, lang).toLowerCase()).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 220 }} showsVerticalScrollIndicator={false}>
        {/* barre du haut : retour rond + titre */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Tap
            onPress={() => router.dismiss()}
            scale={0.9}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <T color={colors.text} style={{ fontSize: 28, lineHeight: 30, marginTop: -3 }}>
              ‹
            </T>
          </Tap>
          <T v="headline">{t('dishDetail')}</T>
          <Tap
            onPress={() => (favorite ? removeRule(favorite.id) : addFavorite(dish.id))}
            scale={0.9}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: favorite ? colors.redSoft : colors.card, borderWidth: 1, borderColor: favorite ? colors.redSoft : colors.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <HeartIcon filled={!!favorite} size={22} color={favorite ? colors.red : colors.text} />
          </Tap>
        </View>

        <DishPhoto id={dish.id} emoji={dish.emoji} height={230} radius={radius.xl} emojiSize={110} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 14 }}>
          {dish.votes ? (
            <>
              <T v="subhead" weight="600" color={colors.green}>
                {t('likes', { n: dish.likes })}
              </T>
              <T v="subhead" color={colors.muted}>
                {t('reviews', { n: dish.votes })}
              </T>
            </>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 }}>
          <T v="title" style={{ flex: 1, paddingRight: 12 }}>
            {dishName(dish, lang)}
          </T>
          <T v="title2" color={colors.brandText}>
            {money(dish.price)}
          </T>
        </View>
        <T v="callout" color={colors.muted} style={{ marginTop: 6 }}>
          {cap(description)}.
        </T>
        {date ? (
          <T v="subhead" weight="600" color={colors.brandText} style={{ marginTop: 10 }}>
            {cap(longDay(date, lang))}
          </T>
        ) : null}

        {conflict.length ? (
          <View style={{ backgroundColor: colors.redSoft, borderRadius: radius.md, padding: 14, marginTop: 16 }}>
            <T v="subhead" weight="600" color={colors.red}>
              {t('allergyWarn', { list: conflict.join(', ') })}
            </T>
          </View>
        ) : null}

        <Card style={{ marginTop: 20 }}>
          <T v="headline">{dish.custom ? t('customize') : t('composition')}</T>
          {dish.custom ? (
            <T v="footnote" color={colors.muted} style={{ marginBottom: 4 }}>
              {t('customizeHint')}
            </T>
          ) : null}
          <View style={{ marginTop: 6 }}>
            {dish.components.map((c) =>
              c.removable ? (
                <Check key={c.id} label={compName(c, lang)} checked={!removed.includes(c.id)} onPress={() => toggleComp(c.id)} />
              ) : (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, marginHorizontal: 10, marginRight: 24 }} />
                  <T v="body">{compName(c, lang)}</T>
                </View>
              ),
            )}
          </View>
          {dish.allergens.length ? (
            <T v="footnote" color={colors.muted} style={{ marginTop: 8 }}>
              {t('allergensTitle')} : {dish.allergens.map((a) => allergenName(a, lang)).join(', ')}
            </T>
          ) : null}
        </Card>

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
            <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
              {t('confirmOrderSub')}
            </T>
            <View style={{ marginTop: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="body" color={colors.muted}>
                  {t('total')}
                </T>
                <T v="headline">{money(total)}</T>
              </View>
              {!anyCredit ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="body" color={colors.muted}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View>
                <T v="footnote" color={colors.muted}>
                  {t('total')}
                </T>
                <T v="title2">{money(total)}</T>
              </View>
              <Button
                label={conflict.length ? t('orderBtn') + ' · ' + t('allergensTitle') : t('orderBtn')}
                style={{ flex: 1 }}
                disabled={picked.length === 0 || refused}
                onPress={() => setConfirming(true)}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
