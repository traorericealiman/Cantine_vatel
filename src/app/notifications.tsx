import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Card, DishTile, T } from '../components/ui';
import { Notif, ProposalButtons, useNotifications } from '../components/notifications';
import { dishById } from '../lib/data';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

function Item({ n }: { n: Notif }) {
  const { t } = useI18n();
  const proposals = useApp((s) => s.proposals);
  const orders = useApp((s) => s.orders);

  const dishId =
    n.kind === 'proposal'
      ? proposals.find((p) => p.id === n.proposalId)?.dishId
      : n.kind === 'turn'
        ? orders.find((o) => o.id === n.orderId)?.dishId
        : undefined;
  const dish = dishId ? dishById(dishId) : undefined;
  const tone = n.kind === 'debt' || n.kind === 'low' || n.kind === 'childLow' || n.kind === 'childCredit' ? colors.warm : colors.brand;

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {dish ? (
          <DishTile emoji={dish.emoji} id={dish.id} size={48} />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.warmSoft, alignItems: 'center', justifyContent: 'center' }}>
            <T v="title2" color={tone}>
              !
            </T>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <T v="headline">{n.title}</T>
          <T v="subhead" color={colors.muted}>
            {n.sub}
          </T>
        </View>
      </View>

      {n.kind === 'proposal' && n.proposalId ? (
        <ProposalButtons id={n.proposalId} />
      ) : null}
      {n.kind === 'turn' && n.orderId ? (
        <Button label={t('aScanCta')} style={{ marginTop: 14 }} onPress={() => router.push('/scan' as any)} />
      ) : null}
      {n.kind === 'childLow' || n.kind === 'childCredit' ? (
        <Button
          label={t('pTopUp')}
          small
          style={{ marginTop: 14, alignSelf: 'flex-start' }}
          onPress={() => router.push(`/parent-recharge?child=${n.childId}` as any)}
        />
      ) : null}
      {n.kind === 'issue' ? <Button label={t('aSeeService')} small style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.navigate('/(admin)/service' as any)} /> : null}
      {n.kind === 'stockLow' ? <Button label={t('aSeeStocks')} small style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.navigate('/(admin)/stocks' as any)} /> : null}
      {n.kind === 'comment' ? <Button label={t('aSeeReviews')} small style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/admin-reviews' as any)} /> : null}
      {n.kind === 'debt' || n.kind === 'low' || n.kind === 'autoFail' ? (
        <Button label={t('topUp')} small style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/recharge' as any)} />
      ) : null}
    </Card>
  );
}

export default function Notifications() {
  const { t } = useI18n();
  const role = useApp((s) => s.role);
  const list = useNotifications();
  const markRead = useApp((s) => s.markNotifsRead);
  useEffect(() => {
    // Elles sont marquées comme lues quand on quitte l'écran, pour que les nouvelles restent visibles à l'ouverture.
    return () => markRead();
  }, [markRead]);
  return (
    <>
      <Stack.Screen options={{ title: t('notifTitle') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <T v="title2" align="center">
              {role === 'parent' ? t('pNotifEmpty') : t('notifEmpty')}
            </T>
          </View>
        ) : (
          list.map((n) => <Item key={n.id} n={n} />)
        )}
      </ScrollView>
    </>
  );
}
