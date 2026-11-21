import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AdminHeader, Progress, Section, StatCard } from '../../components/admin';
import { Reveal } from '../../components/fx';
import { Button, Card, Screen, T, Tag } from '../../components/ui';
import { money } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { spentOf, useAdmin } from '../../store/admin';
import { useI18n } from '../../store/app';

/** Stocks : niveau de chaque ingrédient par rapport à son seuil, dépenses et inventaire hebdomadaire. */
export default function Stocks() {
  const { t, lang } = useI18n();
  const ingredients = useAdmin((s) => s.ingredients);
  const done = useAdmin((s) => s.inventoryDone);
  const purchases = useAdmin((s) => s.purchases);
  const budgetNext = useAdmin((s) => s.stats.budgetNext);
  const sorted = [...ingredients].sort((a, b) => a.stock / Math.max(a.threshold, 1) - b.stock / Math.max(b.threshold, 1));
  const low = sorted.filter((i) => i.stock < i.threshold).length;

  return (
    <Screen topPad={10} fixedHeader>
      <AdminHeader title={t('tabStocks')} />

      <Reveal delay={40}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label={t('aSpentWeek')} value={money(spentOf(purchases))} detail={t('aPurchasesCount', { n: purchases.length })} />
          <StatCard label={t('aBudget')} value={money(budgetNext)} />
        </View>
      </Reveal>

      <Reveal delay={90}>
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="headline">{t('aPurchases')}</T>
            <Tag label={done ? '✓' : '!'} tone={done ? 'green' : 'warm'} />
          </View>
          <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
            {done ? t('aInventoryDone') : t('aInventoryTodo')}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button label={t('aAddPurchase')} small style={{ flex: 1 }} onPress={() => router.push('/admin-purchase' as any)} />
            <Button label={t('aInventory')} kind="soft" small style={{ flex: 1 }} onPress={() => router.push('/admin-inventory' as any)} />
          </View>
          <Button label={t('aAddIngredient')} kind="soft" small style={{ marginTop: 10 }} onPress={() => router.push('/admin-ingredient' as any)} />
        </Card>
      </Reveal>

      <Section title={t('tabStocks')} right={low ? <Tag label={`${low} · ${t('aLow')}`} tone="red" /> : undefined}>
        <Card padded={false}>
          {sorted.map((i, idx) => {
            const ratio = i.stock / Math.max(i.threshold * 2, 1);
            const isLow = i.stock < i.threshold;
            return (
              <Pressable key={i.id} onPress={() => router.push(`/admin-ingredient?id=${i.id}` as any)} style={({ pressed }) => ({ padding: 16, borderTopWidth: idx ? 1 : 0, borderTopColor: colors.line, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T v="headline">{lang === 'fr' ? i.fr : i.en}</T>
                    <T v="caption" color={colors.muted}>
                      {t('aThreshold', { n: `${i.threshold} ${i.unit}` })}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T v="headline" color={isLow ? colors.red : colors.text}>
                      {i.stock} {i.unit}
                    </T>
                    {isLow ? (
                      <T v="caption" weight="700" color={colors.red}>
                        {t('aLow')}
                      </T>
                    ) : null}
                  </View>
                </View>
                <Progress value={ratio} tone={isLow ? colors.red : colors.brand} />
              </Pressable>
            );
          })}
        </Card>
      </Section>
    </Screen>
  );
}
