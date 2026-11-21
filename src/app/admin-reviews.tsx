import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Progress } from '../components/admin';
import { Card, DishTile, Screen, T } from '../components/ui';
import { DISHES } from '../lib/data';
import { dishName } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Avis des élèves : un plat par ligne (part de 👍, votes), et ses commentaires en touchant le plat. */
export default function AdminReviews() {
  const { t, lang } = useI18n();
  const comments = useAdmin((s) => s.comments);
  const [open, setOpen] = useState<string | null>(null);

  // Les plats qui ont des commentaires d'abord, puis ceux qui ont le plus de votes.
  const rows = useMemo(
    () =>
      DISHES.map((dish) => ({ dish, list: comments.filter((c) => c.dishId === dish.id) }))
        .filter((r) => r.dish.votes > 0 || r.list.length > 0)
        .sort((a, b) => b.list.length - a.list.length || b.dish.votes - a.dish.votes),
    [comments],
  );

  return (
    <>
      <Stack.Screen options={{ title: t('tabReviews') }} />
      <Screen topPad={0} bottomPad={40} backdrop={false}>
        <T v="subhead" color={colors.muted} style={{ marginTop: 8, marginBottom: 14 }}>
          {t('aCommentsCount', { n: comments.length })}
        </T>

        {rows.length === 0 ? (
          <Card>
            <T v="body" color={colors.muted}>
              {t('aNoReviews')}
            </T>
          </Card>
        ) : null}

        {rows.map(({ dish, list }) => {
          const isOpen = open === dish.id;
          return (
            <Card key={dish.id} padded={false} style={{ marginBottom: 12 }}>
              <Pressable onPress={() => setOpen(isOpen ? null : dish.id)} style={({ pressed }) => ({ padding: 14, opacity: pressed ? 0.8 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DishTile emoji={dish.emoji} id={dish.id} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <T v="headline">{dishName(dish, lang)}</T>
                    <T v="footnote" color={colors.muted}>
                      {dish.votes > 0 ? `👍 ${dish.likes} % · ${t('aVotes', { n: dish.votes })}` : t('aNewNoVotes')}
                    </T>
                  </View>
                  <View style={{ backgroundColor: list.length ? colors.brand : colors.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <T v="caption" weight="700" color={list.length ? colors.onBrand : colors.muted}>
                      {list.length}
                    </T>
                  </View>
                  <T v="title2" color="#CBD5E1" style={{ marginLeft: 8 }}>
                    {isOpen ? '⌄' : '›'}
                  </T>
                </View>
                {dish.votes > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Progress value={dish.likes / 100} tone={dish.likes >= 85 ? colors.green : dish.likes >= 78 ? colors.brand : colors.warm} />
                  </View>
                ) : null}
              </Pressable>

              {isOpen ? (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.line, padding: 14, gap: 10 }}>
                  {list.length === 0 ? (
                    <T v="subhead" color={colors.muted}>
                      {t('aNoComments')}
                    </T>
                  ) : (
                    list.map((c, k) => (
                      <View key={k} style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <T v="caption" weight="700" color={colors.muted}>
                            {c.author}
                          </T>
                          <T v="subhead">{c.vote === 1 ? '👍' : '👎'}</T>
                        </View>
                        <T v="body" style={{ marginTop: 4 }}>
                          « {c.text} »
                        </T>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </Card>
          );
        })}
      </Screen>
    </>
  );
}
