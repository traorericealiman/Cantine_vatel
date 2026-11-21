import { Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Reveal, Tap } from '../../components/fx';
import { HeartIcon, TrashIcon } from '../../components/icons';
import { Card, DishPhoto, DishTile, LangPill, Screen, T } from '../../components/ui';
import { DISHES, daysServing, dishById, isOpen } from '../../lib/data';
import { dishName, money } from '../../lib/i18n';
import { colors, radius } from '../../lib/theme';
import { useApp, useI18n } from '../../store/app';

/**
 * Plats préférés : on les ajoute d'un cœur. Avec « Me prévenir » activé, dès qu'un plat est au menu,
 * l'élève reçoit une proposition à confirmer (Oui / Non). Jamais de commande sans son accord.
 */
export default function Favorites() {
  const { t, lang } = useI18n();
  const rules = useApp((s) => s.rules);
  const setMode = useApp((s) => s.setFavoriteMode);
  const remove = useApp((s) => s.removeRule);
  const add = useApp((s) => s.addFavorite);

  const others = DISHES.filter((d) => !rules.some((r) => r.dishId === d.id));
  const openDish = (id: string) => {
    const date = daysServing(id).find((k) => isOpen(k));
    router.push((date ? `/dish/${id}?date=${date}` : `/dish/${id}`) as any);
  };

  return (
    <Screen topPad={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <T v="title">{t('tabFavorites')}</T>
        <LangPill />
      </View>

      {/* Explication courte, en une carte bleu nuit */}
      <View style={{ backgroundColor: colors.brand, borderRadius: radius.xl, padding: 18, marginBottom: 26 }}>
        <T v="headline" color={colors.onBrand}>
          {t('favHowTitle')}
        </T>
        <T v="subhead" color="rgba(255,255,255,0.8)" style={{ marginTop: 6 }}>
          {t('favAutoHint')}
        </T>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginHorizontal: 4 }}>
        <T v="footnote" weight="700" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('favTitle')}
        </T>
        {rules.length ? (
          <T v="footnote" weight="600" color={colors.muted}>
            {rules.length}
          </T>
        ) : null}
      </View>

      {rules.length === 0 ? (
        <Card>
          <T v="body" color={colors.muted}>
            {t('favEmpty')}
          </T>
        </Card>
      ) : (
        <Card padded={false}>
          {rules.map((r, i) => {
            const dish = dishById(r.dishId);
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <Pressable onPress={() => openDish(dish.id)}>
                  <DishTile emoji={dish.emoji} id={dish.id} size={56} />
                </Pressable>
                <View style={{ flex: 1, marginHorizontal: 14 }}>
                  <T v="headline" numberOfLines={1}>
                    {dishName(dish, lang)}
                  </T>
                  <T v="footnote" color={r.ask ? colors.green : colors.muted} weight="600" style={{ marginTop: 2 }}>
                    {r.ask ? t('favStateAsk') : t('favOff')}
                  </T>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Switch value={r.ask} onValueChange={(v) => setMode(r.id, v ? 'ask' : 'off')} trackColor={{ true: colors.brand, false: '#CBD5E1' }} thumbColor={colors.white} />
                  <T v="caption" color={colors.muted} style={{ marginTop: 4 }}>
                    {t('favModeAsk')}
                  </T>
                </View>
                <Pressable
                  onPress={() => remove(r.id)}
                  accessibilityLabel={t('favRemove')}
                  hitSlop={8}
                  style={({ pressed }) => ({ width: 40, height: 40, marginLeft: 8, borderRadius: 20, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
                >
                  <TrashIcon size={19} />
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      {others.length > 0 ? (
        <>
          <T v="footnote" weight="700" color={colors.muted} style={{ marginTop: 28, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('favAddTitle')}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {others.map((d, i) => (
              <Reveal key={d.id} delay={i * 40} style={{ width: '48%' }}>
                <Tap onPress={() => add(d.id)} scale={0.96}>
                  <View style={{ height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.text }}>
                    <DishPhoto id={d.id} emoji={d.emoji} height={150} radius={0} />
                    <LinearGradient colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.8)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }} />
                    <View style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                      <HeartIcon size={18} color={colors.red} />
                    </View>
                    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
                      <T v="subhead" weight="700" color={colors.white} numberOfLines={1}>
                        {dishName(d, lang)}
                      </T>
                      <T v="caption" color="rgba(255,255,255,0.8)">
                        {money(d.price)}
                      </T>
                    </View>
                  </View>
                </Tap>
              </Reveal>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
