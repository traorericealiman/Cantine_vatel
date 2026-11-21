import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard } from '../components/admin';
import { Button, Card, Segmented, T } from '../components/ui';
import { dateKey } from '../lib/data';
import { cap, dishName, longDay, money } from '../lib/i18n';
import { colors } from '../lib/theme';
import { catalogDish, spentOf, useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/**
 * Inventaire de la semaine en deux journaux :
 * Achats (ce qui entre : produit, quantité, montant, fournisseur, plats) et Consommation (ce que la cuisine a utilisé).
 */
export default function AdminInventory() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'buy' | 'use'>(params.tab === 'use' ? 'use' : 'buy');
  const purchases = useAdmin((s) => s.purchases);
  const usages = useAdmin((s) => s.usages);
  const catalog = useAdmin((s) => s.catalog);
  const removePurchase = useAdmin((s) => s.removePurchase);
  const removeUsage = useAdmin((s) => s.removeUsage);
  const done = useAdmin((s) => s.inventoryDone);
  const validate = useAdmin((s) => s.validateWeek);

  const dishes = (ids: string[]) => ids.map((id) => dishName(catalogDish(catalog, id), lang)).join(', ');
  const when = (at: number) => cap(longDay(dateKey(new Date(at)), lang));
  const del = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
      <T v="footnote" weight="600" color={colors.red}>
        {t('aDelete')}
      </T>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('aInventory') }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label={t('aSpentWeek')} value={money(spentOf(purchases))} detail={t('aPurchasesCount', { n: purchases.length })} />
            <StatCard label={t('aUsedWeek')} value={String(usages.length)} detail={t('aUsagesCount', { n: usages.length })} />
          </View>

          <View style={{ marginTop: 16 }}>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { key: 'buy', label: t('aPurchasesTab') },
                { key: 'use', label: t('aUsagesTab') },
              ]}
            />
          </View>

          <Button
            label={tab === 'buy' ? t('aAddPurchase') : t('aAddUsage')}
            style={{ marginTop: 16 }}
            onPress={() => router.push((tab === 'buy' ? '/admin-purchase' : '/admin-usage') as any)}
          />

          {tab === 'buy' ? (
            purchases.length === 0 ? (
              <Card style={{ marginTop: 16 }}>
                <T v="body" color={colors.muted}>
                  {t('aNoPurchases')}
                </T>
              </Card>
            ) : (
              purchases.map((p) => (
                <Card key={p.id} style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <T v="headline">{p.name}</T>
                      <T v="footnote" color={colors.muted}>
                        + {p.qty} {p.unit} · {when(p.at)}
                      </T>
                    </View>
                    <T v="headline">{money(p.amount)}</T>
                  </View>
                  {p.supplier ? (
                    <T v="subhead" style={{ marginTop: 8 }}>
                      {t('aSupplier')} : {p.supplier}
                    </T>
                  ) : null}
                  {p.usedFor.length ? (
                    <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
                      {t('aUsedFor')} : {dishes(p.usedFor)}
                    </T>
                  ) : null}
                  {p.note ? (
                    <T v="footnote" color={colors.muted} style={{ marginTop: 4 }}>
                      « {p.note} »
                    </T>
                  ) : null}
                  {del(() => removePurchase(p.id))}
                </Card>
              ))
            )
          ) : usages.length === 0 ? (
            <Card style={{ marginTop: 16 }}>
              <T v="body" color={colors.muted}>
                {t('aNoUsages')}
              </T>
            </Card>
          ) : (
            usages.map((u) => (
              <Card key={u.id} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <T v="headline">{u.name}</T>
                    <T v="footnote" color={colors.muted}>
                      {when(u.at)}
                    </T>
                  </View>
                  <T v="headline" color={colors.red}>
                    − {u.qty} {u.unit}
                  </T>
                </View>
                {u.usedFor.length ? (
                  <T v="subhead" color={colors.muted} style={{ marginTop: 8 }}>
                    {t('aUsedFor')} : {dishes(u.usedFor)}
                  </T>
                ) : null}
                {u.note ? (
                  <T v="footnote" color={colors.muted} style={{ marginTop: 4 }}>
                    « {u.note} »
                  </T>
                ) : null}
                {del(() => removeUsage(u.id))}
              </Card>
            ))
          )}
        </ScrollView>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
          {done ? (
            <T v="subhead" weight="600" color={colors.green} align="center">
              ✓ {t('aInventoryDone')}
            </T>
          ) : (
            <Button label={t('aValidateWeek')} kind="dark" onPress={validate} />
          )}
        </View>
      </View>
    </>
  );
}
