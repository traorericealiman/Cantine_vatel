import { View } from 'react-native';
import { router } from 'expo-router';
import { ChildPicker } from '../../components/ChildPicker';
import { Reveal } from '../../components/fx';
import { BellButton, ProfileButton } from '../../components/notifications';
import { WalletCard } from '../../components/WalletCard';
import { Button, Card, DishTile, LangPill, Screen, Tag, T } from '../../components/ui';
import { dateKey, dishById } from '../../lib/data';
import { cap, dishName, longDay, money } from '../../lib/i18n';
import { colors, radius } from '../../lib/theme';
import { CHILDREN, Order, useApp, useChildWallet, useI18n } from '../../store/app';

function SectionHead({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 30, marginBottom: 14 }}>
      <T v="title2">{title}</T>
    </View>
  );
}

function TopRow() {
  return (
    <Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LangPill />
          <BellButton />
          <ProfileButton />
        </View>
      </View>
    </Reveal>
  );
}

function UpcomingRow({ order, first }: { order: Order; first: boolean }) {
  const { t, lang } = useI18n();
  const dish = dishById(order.dishId);
  const isToday = order.date === dateKey(new Date());
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>
      <DishTile emoji={dish.emoji} id={dish.id} size={48} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <T v="headline">{dishName(dish, lang)}</T>
        <T v="footnote" color={colors.muted}>
          {isToday ? t('today') : cap(longDay(order.date, lang))}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <T v="headline">{money(order.price + order.fee)}</T>
        {order.onCredit ? <Tag label={t('credit')} tone="warm" /> : null}
      </View>
    </View>
  );
}

export default function ParentHome() {
  const { t } = useI18n();
  const selected = useApp((s) => s.selectedChild);
  const threshold = useApp((s) => s.lowThreshold);
  const subscribed = useApp((s) => !!s.subscriptions[selected]);
  const child = CHILDREN.find((c) => c.id === selected) ?? CHILDREN[0];
  const wallet = useChildWallet(child.id);
  const recharge = () => router.push(`/parent-recharge?child=${child.id}` as any);

  const upcoming = wallet.orders.filter((o) => o.status === 'ordered').sort((a, b) => a.date.localeCompare(b.date));
  const low = wallet.balance < threshold;

  return (
    <Screen topPad={10}>
      <TopRow />

      <Reveal delay={30}>
        <ChildPicker />
        <View style={{ marginTop: CHILDREN.length > 1 ? 14 : 0, marginBottom: 14, marginLeft: 4 }}>
          <T v="headline">{child.name}</T>
          <T v="footnote" color={colors.muted}>
            {child.matricule}
          </T>
        </View>
      </Reveal>

      <WalletCard childId={child.id} />

      {low ? (
        <Reveal delay={120}>
          <View style={{ backgroundColor: colors.warmSoft, borderRadius: radius.md, padding: 16, marginTop: 14 }}>
            <T v="headline" color={colors.warm}>
              {t('pLowTitle')}
            </T>
            <T v="subhead" color={colors.warm} style={{ marginTop: 2 }}>
              {t('pLowSub', { threshold: money(threshold) })}
            </T>
            <Button label={t('pTopUp')} small style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={recharge} />
          </View>
        </Reveal>
      ) : null}

      <Reveal delay={170}>
        <Card style={{ marginTop: 14 }}>
          {subscribed ? (
            <>
              <Tag label={t('pSubscribed')} tone="green" />
              <T v="headline" style={{ marginTop: 10 }}>
                {t('promoTitle')}
              </T>
            </>
          ) : (
            <>
              <Tag label={t('promoTag')} />
              <T v="headline" style={{ marginTop: 10 }}>
                {t('promoTitle')}
              </T>
              <Button
                label={t('promoCta')}
                kind="soft"
                small
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
                onPress={() => router.push(`/parent-recharge?child=${child.id}&tab=offer` as any)}
              />
            </>
          )}
        </Card>
      </Reveal>

      <Reveal delay={220}>
        <SectionHead title={t('pUpcoming')} />
        {upcoming.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
            <T v="subhead" color={colors.muted} align="center">
              {t('pNoUpcoming')}
            </T>
          </Card>
        ) : (
          <Card padded={false}>
            {upcoming.map((o, i) => (
              <UpcomingRow key={o.id} order={o} first={i === 0} />
            ))}
          </Card>
        )}
        <T v="footnote" color={colors.muted} style={{ marginTop: 12, marginLeft: 4 }}>
          {t('pOnlyChild')}
        </T>
      </Reveal>
    </Screen>
  );
}
