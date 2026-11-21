import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminHeader } from '../../components/admin';
import { Reveal, Tap } from '../../components/fx';
import { Button, Card, DishPhoto, DishTile, Screen, T, Tag } from '../../components/ui';
import { Cat, Dish, serviceDays } from '../../lib/data';
import { Key, cap, dayNumber, dishName, longDay, money, shortDay } from '../../lib/i18n';
import { colors, radius } from '../../lib/theme';
import { adminMenu, bestOf, useAdmin } from '../../store/admin';
import { useI18n } from '../../store/app';

const CAT_LABEL: Record<Cat, Key> = { starter: 'starter', main: 'main', dessert: 'dessert' };

/** Liste horizontale de plats à choisir (remplacement ou ajout), du plus aimé au moins aimé. */
function DishPicker({ list, onPick }: { list: Dish[]; onPick: (d: Dish) => void }) {
  const { t, lang } = useI18n();
  if (!list.length) {
    return (
      <T v="footnote" color={colors.muted} style={{ marginLeft: 14 }}>
        {t('aCatalogCount', { n: 0 })}
      </T>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
      {list.map((d) => (
        <Tap key={d.id} scale={0.96} onPress={() => onPick(d)}>
          <View style={{ width: 132, height: 120, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.brand }}>
            <DishPhoto id={d.id} emoji={d.emoji} height={120} radius={0} />
            <LinearGradient colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.85)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 }} />
            <View style={{ position: 'absolute', left: 10, right: 10, bottom: 8 }}>
              <T v="footnote" weight="700" color={colors.white} numberOfLines={1}>
                {dishName(d, lang)}
              </T>
              <T v="caption" color="rgba(255,255,255,0.8)">
                {d.votes ? `👍 ${d.likes} %` : t('aNewNoVotes')}
              </T>
            </View>
          </View>
        </Tap>
      ))}
    </ScrollView>
  );
}

/** Planification : un jour, ses plats par catégorie, remplacement par les plats les plus aimés, puis publication. */
export default function Menus() {
  const { t, lang } = useI18n();
  const days = useMemo(() => serviceDays(), []);
  const [day, setDay] = useState(days[0].key);
  const [open, setOpen] = useState<string | null>(null);
  const overrides = useAdmin((s) => s.menu[day]);
  const published = useAdmin((s) => !!s.published[day]);
  const setDish = useAdmin((s) => s.setMenuDish);
  const catalog = useAdmin((s) => s.catalog);
  const publish = useAdmin((s) => s.publish);
  const addSlot = useAdmin((s) => s.addMenuSlot);
  const removeSlot = useAdmin((s) => s.removeMenuSlot);
  const slots = adminMenu(day, overrides, catalog);
  const cats: Cat[] = ['starter', 'main', 'dessert'];

  return (
    <Screen topPad={10}>
      <AdminHeader title={t('tabMenus')} />

      <Tap onPress={() => router.push('/admin-dishes' as any)} scale={0.98} style={{ marginBottom: 16 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T v="headline">{t('aCatalog')}</T>
            <T v="footnote" color={colors.muted}>
              {t('aCatalogCount', { n: catalog.length })} · {t('aAddDish')}
            </T>
          </View>
          <T v="title2" color="#CBD5E1">
            ›
          </T>
        </Card>
      </Tap>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {days.map((d) => {
          const on = d.key === day;
          return (
            <Tap
              key={d.key}
              onPress={() => {
                setDay(d.key);
                setOpen(null);
              }}
              scale={0.94}
            >
              <View
                style={{
                  width: 62,
                  paddingVertical: 12,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  backgroundColor: on ? colors.brand : colors.card,
                  borderWidth: 1,
                  borderColor: on ? colors.brand : colors.line,
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

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <T v="headline">{cap(longDay(day, lang))}</T>
        <Tag label={published ? t('aPublished') : t('aDraft')} tone={published ? 'green' : 'warm'} />
      </View>

      {cats.map((cat) => {
        const items = slots.filter((s) => s.cat === cat);
        return (
          <Reveal key={cat + day} delay={60}>
            <T v="footnote" weight="600" color={colors.muted} style={{ marginTop: 22, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {t(CAT_LABEL[cat])}
            </T>
            <Card padded={false}>
              {items.map(({ slot, dish }, i) => (
                <View key={slot} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                    <DishTile emoji={dish.emoji} id={dish.id} size={52} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <T v="headline">{dishName(dish, lang)}</T>
                      <T v="footnote" color={colors.muted}>
                        {money(dish.price)}{dish.votes ? ` · 👍 ${dish.likes} %` : ''}
                      </T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Pressable onPress={() => setOpen(open === slot ? null : slot)} hitSlop={8}>
                        <T v="subhead" weight="600" color={colors.brandText}>
                          {open === slot ? t('close') : t('aReplace')}
                        </T>
                      </Pressable>
                      <Pressable onPress={() => removeSlot(day, slot)} hitSlop={8}>
                        <T v="footnote" weight="600" color={colors.red}>
                          {t('aRemoveFromMenu')}
                        </T>
                      </Pressable>
                    </View>
                  </View>

                  {open === slot ? (
                    <View style={{ paddingBottom: 14 }}>
                      <T v="caption" color={colors.muted} style={{ marginLeft: 14, marginBottom: 8 }}>
                        {t('aSuggestions')}
                      </T>
                      <DishPicker
                        list={bestOf(catalog, cat).filter((d) => d.id !== dish.id)}
                        onPick={(d) => {
                          setDish(day, slot, d.id);
                          setOpen(null);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
              <View style={{ borderTopWidth: items.length ? 1 : 0, borderTopColor: colors.line }}>
                <Pressable onPress={() => setOpen(open === `add-${cat}` ? null : `add-${cat}`)} style={{ padding: 14 }}>
                  <T v="subhead" weight="600" color={colors.brandText}>
                    {open === `add-${cat}` ? t('close') : `+ ${t('aAddToMenu')}`}
                  </T>
                </Pressable>
                {open === `add-${cat}` ? (
                  <View style={{ paddingBottom: 14 }}>
                    <DishPicker
                      list={bestOf(catalog, cat).filter((d) => !items.some((i) => i.dish.id === d.id))}
                      onPick={(d) => {
                        addSlot(day, cat, d.id);
                        setOpen(null);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          </Reveal>
        );
      })}

      {published ? (
        <T v="footnote" color={colors.muted} style={{ marginTop: 18, marginLeft: 4 }}>
          {t('aPublishedHint')}
        </T>
      ) : (
        <Button label={t('aPublish')} style={{ marginTop: 22 }} onPress={() => publish(day)} />
      )}
    </Screen>
  );
}
