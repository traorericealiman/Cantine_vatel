import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Tap } from './fx';
import { Button, T } from './ui';
import { dishById } from '../lib/data';
import { dishName, money, relativeDay } from '../lib/i18n';
import { colors, shadow } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export interface Notif {
  id: string;
  kind: 'turn' | 'proposal' | 'debt' | 'low' | 'childLow' | 'childCredit' | 'payment' | 'refund' | 'resolved' | 'autoOrder' | 'autoFail' | 'issue' | 'stockLow' | 'comment' | 'orderOk' | 'orderCancelled';
  title: string;
  sub: string;
  read: boolean;
  proposalId?: string;
  orderId?: string;
  childId?: string;
}

/**
 * Les notifications viennent de l'historique de la base pour la personne connectée.
 * Le texte est composé ici, dans la langue de l'utilisateur, à partir des données de chaque événement.
 */
export function useNotifications(): Notif[] {
  const { t, lang } = useI18n();
  const notifs = useApp((s) => s.notifs);
  const role = useApp((s) => s.role);
  const orders = useApp((s) => s.orders);
  const proposals = useApp((s) => s.proposals);
  const out: Notif[] = [];

  notifs.forEach((n) => {
    const d = n.data;
    const dish = d.dish ? dishName(dishById(d.dish), lang) : '';
    const day = d.day ? relativeDay(d.day, lang) : '';
    const base = { id: n.id, read: n.read };
    if (n.kind === 'turn') {
      out.push({ ...base, kind: 'turn', title: t('notifTurn'), sub: t('notifTurnSub', { dish }), orderId: orders.find((o) => o.dishId === d.dish && o.date === d.day && o.status === 'ordered')?.id });
    } else if (n.kind === 'proposal') {
      const p = proposals.find((x) => x.id === d.proposal && x.status === 'pending');
      out.push({ ...base, kind: 'proposal', title: t('notifProposal', { dish, day }), sub: t('notifProposalSub'), proposalId: p?.id });
    } else if (n.kind === 'low') {
      if (role === 'parent') out.push({ ...base, kind: 'childLow', childId: d.student, title: t('pNotifLow', { name: d.name }), sub: t('pNotifLowSub', { balance: money(d.balance) }) });
      else out.push({ ...base, kind: 'low', title: t('notifLow'), sub: t('notifLowSub', { balance: money(d.balance) }) });
    } else if (n.kind === 'credit') {
      if (role === 'parent') out.push({ ...base, kind: 'childCredit', childId: d.student, title: t('pNotifCredit', { name: d.name }), sub: t('pNotifCreditSub', { dish, debt: money(d.debt) }) });
      else out.push({ ...base, kind: 'debt', title: t('notifDebt'), sub: t('notifDebtSub', { debt: money(d.debt) }) });
    } else if (n.kind === 'order') {
      out.push({ ...base, kind: 'orderOk', title: t('notifOrder'), sub: t(d.credit ? 'notifOrderCreditSub' : 'notifOrderSub', { dish, day, amount: money(d.amount) }) });
    } else if (n.kind === 'order_cancelled') {
      out.push({ ...base, kind: 'orderCancelled', title: t('notifCancelled'), sub: t('notifCancelledSub', { dish, amount: money(d.amount) }) });
    } else if (n.kind === 'issue') {
      out.push({ ...base, kind: 'issue', title: t('notifIssue'), sub: t('notifIssueSub', { name: d.name, dish }) });
    } else if (n.kind === 'stock_low') {
      out.push({ ...base, kind: 'stockLow', title: t('notifStock'), sub: t('notifStockSub', { name: d.name, n: d.stock, unit: d.unit }) });
    } else if (n.kind === 'comment') {
      out.push({ ...base, kind: 'comment', title: t('notifComment'), sub: t('notifCommentSub', { dish, text: d.text }) });
    } else if (n.kind === 'auto_order') {
      out.push({ ...base, kind: 'autoOrder', title: t('notifAuto'), sub: t('notifAutoSub', { dish, day }) });
    } else if (n.kind === 'auto_fail') {
      out.push({ ...base, kind: 'autoFail', title: t('notifAutoFail'), sub: t('notifAutoFailSub', { dish, day }) });
    } else if (n.kind === 'refund') {
      out.push({ ...base, kind: 'refund', title: t('notifRefund'), sub: t('notifRefundSub', { dish, amount: money(d.amount) }) });
    } else if (n.kind === 'resolved') {
      out.push({ ...base, kind: 'resolved', title: t('notifResolved'), sub: t('notifResolvedSub', { dish }) });
    } else if (n.kind === 'payment') {
      out.push({ ...base, kind: 'payment', title: t('notifPayment'), sub: t('notifPaymentSub', { amount: money(d.amount) }) });
    }
  });
  return out;
}

/** Cloche dessinée en formes simples, avec pastille du nombre de notifications. */
export function BellButton() {
  const count = useNotifications().filter((n) => !n.read).length;
  return (
    <Tap
      onPress={() => router.push('/notifications' as any)}
      scale={0.9}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow,
        shadowOpacity: 0.06,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 4, height: 3, borderRadius: 2, backgroundColor: colors.text }} />
        <View
          style={{
            width: 16,
            height: 13,
            backgroundColor: colors.text,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
        <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: colors.text, marginTop: -1 }} />
        <View style={{ width: 6, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.text, marginTop: 1 }} />
      </View>
      {count > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 5,
            backgroundColor: colors.brand,
            borderWidth: 2,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T v="caption" weight="700" color={colors.onBrand} style={{ fontSize: 11, lineHeight: 14 }}>
            {count}
          </T>
        </View>
      ) : null}
    </Tap>
  );
}

/** Bouton de profil : tête et épaules dessinées avec des formes simples. */
export function ProfileButton() {
  const role = useApp((s) => s.role);
  return (
    <Tap
      onPress={() => router.navigate((role === 'admin' ? '/(admin)/profile' : role === 'parent' ? '/(parent)/account' : '/(tabs)/profile') as any)}
      scale={0.9}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow,
        shadowOpacity: 0.06,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text }} />
        <View style={{ width: 20, height: 9, marginTop: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.text }} />
      </View>
    </Tap>
  );
}

/** Oui / Non d'une proposition. Si la commande est refusée, on explique pourquoi au lieu de ne rien afficher. */
export function ProposalButtons({ id }: { id: string }) {
  const { t } = useI18n();
  const answer = useApp((s) => s.answerProposal);
  const orderError = useApp((s) => s.orderError);
  const [why, setWhy] = useState<string | null>(null);
  const [asked, setAsked] = useState(0);

  const explain = (code: string) =>
    /closed/.test(code) ? t('closed') : /category/.test(code) ? t('categoryTaken') : /credit/.test(code) ? t('creditLimit') : /menu/.test(code) ? t('notOnMenu') : t('orderFailed');

  // Refus décidé par le serveur juste après notre « Oui » : déduit pendant le rendu, sans effet.
  const serverWhy = asked && orderError && orderError.at >= asked ? explain(orderError.code) : null;
  const shownWhy = why ?? serverWhy;

  const respond = (accept: boolean) => {
    const r = answer(id, accept);
    if (accept) setAsked(Date.now());
    if (r === 'closed') setWhy(t('closed'));
    else if (r === 'category') setWhy(t('categoryTaken'));
    else if (r === 'limit') setWhy(t('creditLimit'));
    else if (r === 'gone') setWhy(t('proposalGone'));
  };

  if (shownWhy) {
    return (
      <View style={{ marginTop: 14 }}>
        <View style={{ backgroundColor: colors.warmSoft, borderRadius: 14, padding: 12 }}>
          <T v="subhead" weight="600" color={colors.warm}>
            {t('cantOrder')}
          </T>
          <T v="footnote" color={colors.warm} style={{ marginTop: 2 }}>
            {shownWhy}
          </T>
        </View>
        <Button label={t('understood')} kind="soft" small style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => answer(id, false)} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
      <Button label={t('no')} kind="soft" small style={{ flex: 1 }} onPress={() => respond(false)} />
      <Button label={t('yes')} small style={{ flex: 1 }} onPress={() => respond(true)} />
    </View>
  );
}
