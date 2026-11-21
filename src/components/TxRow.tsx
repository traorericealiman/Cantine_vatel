import { View } from 'react-native';
import { DishTile, T } from './ui';
import { DISHES, dateKey } from '../lib/data';
import { cap, dishName, longDay, money } from '../lib/i18n';
import { colors } from '../lib/theme';
import { Tx, useI18n } from '../store/app';

export function TxRow({ tx, last }: { tx: Tx; last?: boolean }) {
  const { t, lang } = useI18n();
  const dish = tx.dishId ? DISHES.find((d) => d.id === tx.dishId) : undefined;
  const income = tx.amount > 0;
  const title =
    tx.kind === 'topup' ? t('txTopup') : tx.kind === 'debt' ? t('txDebt') : tx.kind === 'refund' ? `${t('txRefund')} · ${dish ? dishName(dish, lang) : ''}` : dish ? dishName(dish, lang) : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: tx.kind === 'topup' ? colors.greenSoft : tx.kind === 'debt' ? colors.warmSoft : colors.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dish ? (
          <DishTile emoji={dish.emoji} id={dish.id} size={46} />
        ) : (
          <T v="title2" color={tx.kind === 'topup' ? colors.green : colors.warm}>
            {tx.kind === 'topup' ? '+' : '–'}
          </T>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <T v="headline" numberOfLines={1}>
          {title}
        </T>
        <T v="footnote" color={colors.muted}>
          {cap(longDay(dateKey(new Date(tx.at)), lang))}
          {tx.credit ? ` · ${t('thisIsCredit')}` : ''}
        </T>
      </View>
      <T v="headline" color={income ? colors.green : colors.text}>
        {income ? '+' : '−'}
        {money(Math.abs(tx.amount))}
      </T>
    </View>
  );
}

