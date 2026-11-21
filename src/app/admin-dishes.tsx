import { Pressable, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Card, DishTile, T } from '../components/ui';
import { Cat } from '../lib/data';
import { Key, allergenName, dishName, money } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

const CATS: { key: Cat; label: Key }[] = [
  { key: 'starter', label: 'starter' },
  { key: 'main', label: 'main' },
  { key: 'dessert', label: 'dessert' },
];

/** Catalogue des plats enregistrés : la base dans laquelle on choisit les plats de chaque jour. */
export default function AdminDishes() {
  const { t, lang } = useI18n();
  const catalog = useAdmin((s) => s.catalog);

  return (
    <>
      <Stack.Screen options={{ title: t('aCatalog') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <T v="subhead" color={colors.muted}>
          {t('aCatalogHint')}
        </T>
        <Button label={t('aAddDish')} style={{ marginTop: 16 }} onPress={() => router.push('/admin-dish-new' as any)} />

        {CATS.map(({ key, label }) => {
          const items = catalog.filter((d) => d.cat === key);
          return (
            <View key={key}>
              <T v="footnote" weight="600" color={colors.muted} style={{ marginTop: 24, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {t(label)} · {items.length}
              </T>
              <Card padded={false}>
                {items.map((d, i) => (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push(`/admin-dish-new?id=${d.id}` as any)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, opacity: pressed ? 0.7 : 1 })}
                  >
                    <DishTile emoji={d.emoji} id={d.id} size={48} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <T v="headline">{dishName(d, lang)}</T>
                      <T v="footnote" color={colors.muted} numberOfLines={1}>
                        {d.votes ? `👍 ${d.likes} %` : t('aNewNoVotes')}
                        {d.allergens.length ? ` · ${d.allergens.map((a) => allergenName(a, lang)).join(', ')}` : ''}
                      </T>
                    </View>
                    <T v="headline">{money(d.price)}</T>
                    <T v="title2" color="#CBD5E1" style={{ marginLeft: 8 }}>
                      ›
                    </T>
                  </Pressable>
                ))}
              </Card>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}
