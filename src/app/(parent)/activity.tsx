import { useState } from 'react';
import { View } from 'react-native';
import { ChildPicker } from '../../components/ChildPicker';
import { TxRow } from '../../components/TxRow';
import { Card, DishTile, LangPill, Screen, Segmented, Tag, T } from '../../components/ui';
import { dateKey, dishById } from '../../lib/data';
import { cap, compName, dishName, longDay, money } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { CHILDREN, Order, useApp, useChildWallet, useI18n } from '../../store/app';

/** Une commande de l'enfant : plat, date, prix payé et statut (reçu ou non). Lecture seule. */
function MealRow({ order, first }: { order: Order; first: boolean }) {
  const { t, lang } = useI18n();
  const dish = dishById(order.dishId);
  const today = dateKey(new Date());
  const removed = order.removed
    .map((r) => dish.components.find((c) => c.id === r))
    .filter(Boolean)
    .map((c) => t('without', { x: compName(c!, lang).toLowerCase() }));
  const status =
    order.status === 'received' ? (
      <Tag label={order.syncPending ? t('receivedPending') : t('received')} tone="green" />
    ) : order.date < today ? (
      <Tag label={t('pNotConfirmed')} tone="warm" />
    ) : (
      <Tag label={t('pUpcomingTag')} />
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>
      <DishTile emoji={dish.emoji} id={dish.id} size={48} />
      <View style={{ flex: 1, marginLeft: 14, marginRight: 8 }}>
        <T v="headline" numberOfLines={1}>
          {dishName(dish, lang)}
        </T>
        <T v="footnote" color={colors.muted}>
          {order.date === today ? t('today') : cap(longDay(order.date, lang))}
          {removed.length ? ` · ${removed.join(', ')}` : ''}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <T v="headline">{money(order.price + order.fee)}</T>
        {status}
        {order.onCredit ? (
          <T v="caption" weight="600" color={colors.warm}>
            {t('credit')}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export default function ParentActivity() {
  const { t } = useI18n();
  const selected = useApp((s) => s.selectedChild);
  const child = CHILDREN.find((c) => c.id === selected) ?? CHILDREN[0];
  const wallet = useChildWallet(child.id);
  const [tab, setTab] = useState<'meals' | 'wallet'>('meals');

  const meals = [...wallet.orders].sort((a, b) => b.date.localeCompare(a.date));
  const txs = [...wallet.txs].sort((a, b) => b.at - a.at);

  return (
    <Screen topPad={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <T v="title" numberOfLines={1} style={{ flex: 1, paddingRight: 12 }}>
          {t('tabActivity')}
        </T>
        <LangPill />
      </View>

      <ChildPicker />
      <View style={{ marginTop: CHILDREN.length > 1 ? 14 : 0, marginBottom: 16, marginLeft: 4 }}>
        <T v="headline">{child.name}</T>
        <T v="footnote" color={colors.muted}>
          {child.matricule}
        </T>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'meals', label: t('pMeals') },
          { key: 'wallet', label: t('pWalletTab') },
        ]}
      />

      <View style={{ marginTop: 20 }}>
        <Card padded={false}>
          {tab === 'meals' ? (
            meals.length === 0 ? (
              <T v="subhead" color={colors.muted} style={{ padding: 18 }}>
                {t('pNoMeals')}
              </T>
            ) : (
              meals.map((o, i) => <MealRow key={o.id} order={o} first={i === 0} />)
            )
          ) : txs.length === 0 ? (
            <T v="subhead" color={colors.muted} style={{ padding: 18 }}>
              {t('noTx')}
            </T>
          ) : (
            txs.map((tx, i) => <TxRow key={tx.id} tx={tx} last={i === txs.length - 1} />)
          )}
        </Card>
      </View>
    </Screen>
  );
}
