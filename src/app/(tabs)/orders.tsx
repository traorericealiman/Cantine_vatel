import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button, DishTile, LangPill, Screen, Segmented, T } from '../../components/ui';
import { dateKey, dishById, isOpen, serviceFor } from '../../lib/data';
import { cap, compName, dishName, longDay, money } from '../../lib/i18n';
import { colors, font, noOutline, radius } from '../../lib/theme';
import { Order, useApp, useI18n } from '../../store/app';

/** Disponibilité du plat : « non disponible » tant que l'admin ne l'a pas appelé, puis « disponible » (avec la table si besoin). */
function ServiceLine({ order }: { order: Order }) {
  const { t } = useI18n();
  const called = useApp((s) => s.called);
  const available = !!called[order.date]?.includes(order.dishId);
  const svc = serviceFor(order.date, order.dishId);
  const table = available && svc.mode === 'tables' && svc.table ? ` · ${t('serviceTables', { table: svc.table })}` : '';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: available ? colors.greenSoft : colors.bg,
        borderWidth: 1,
        borderColor: available ? colors.green : colors.line,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginTop: 8,
      }}
    >
      <T v="footnote" weight="700" color={available ? colors.green : colors.muted}>
        {(available ? t('dishAvailable') : t('dishUnavailable')) + table}
      </T>
    </View>
  );
}

function Rating({ order }: { order: Order }) {
  const { t } = useI18n();
  const vote = useApp((s) => s.voteOrder);
  const comment = useApp((s) => s.commentOrder);
  const [text, setText] = useState(order.comment ?? '');
  const [sent, setSent] = useState(!!order.comment);

  const choice = (v: 1 | -1) => {
    const on = order.vote === v;
    const tone = v === 1 ? colors.green : colors.red;
    return (
      <Pressable
        onPress={() => {
          // toucher à nouveau le pouce choisi retire l'avis
          if (order.vote === v) {
            setText('');
            setSent(false);
          }
          vote(order.id, v);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 9,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: tone,
          backgroundColor: on ? tone : colors.card,
        }}
      >
        <T style={{ fontSize: 16 }}>{v === 1 ? '👍' : '👎'}</T>
        <T v="subhead" weight="600" color={on ? colors.onBrand : tone}>
          {v === 1 ? t('good') : t('bad')}
        </T>
      </Pressable>
    );
  };

  return (
    <View style={{ marginTop: 12 }}>
      <T v="footnote" color={colors.muted} style={{ marginBottom: 8 }}>
        {t('rateDish')}
      </T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {choice(1)}
        {choice(-1)}
      </View>
      {order.vote && !sent ? (
        <View style={{ marginTop: 12 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('comment')}
            placeholderTextColor="#94A3B8"
            multiline
            style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, minHeight: 48, fontSize: 16, color: colors.text, ...font('400'), ...noOutline }}
          />
          <Button
            label={t('send')}
            kind="soft"
            small
            style={{ marginTop: 10, alignSelf: 'flex-end' }}
            onPress={() => {
              if (text.trim()) comment(order.id, text.trim());
              setSent(true);
            }}
          />
        </View>
      ) : null}
      {order.vote && sent ? (
        <T v="footnote" color={colors.muted} style={{ marginTop: 8 }}>
          {t('thanks')}
        </T>
      ) : null}
    </View>
  );
}

function OrderRow({ order, finished, first }: { order: Order; finished: boolean; first: boolean }) {
  const { t, lang } = useI18n();
  const cancel = useApp((s) => s.cancelOrder);
  const called = useApp((s) => s.called);
  const issue = useApp((s) => s.issues[order.id]);
  const reportIssue = useApp((s) => s.reportIssue);
  const [ask, setAsk] = useState(false);
  const dish = dishById(order.dishId);
  const isToday = order.date === dateKey(new Date());
  const open = isOpen(order.date);
  const available = !!called[order.date]?.includes(order.dishId);
  const myTurn = !finished && available;
  const canCancel = open && !available;
  const removedNames = order.removed
    .map((r) => dish.components.find((c) => c.id === r))
    .filter(Boolean)
    .map((c) => t('without', { x: compName(c!, lang).toLowerCase() }));

  return (
    <View style={{ marginBottom: 14, borderRadius: radius.xl, backgroundColor: colors.card, borderWidth: 1, borderColor: myTurn ? colors.brand : colors.line, overflow: 'hidden' }}>
      {myTurn ? (
        <View style={{ backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 10 }}>
          <T v="subhead" weight="700" color={colors.onBrand}>
            {t('yourTurn')} · {t('yourTurnSub')}
          </T>
        </View>
      ) : null}

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <DishTile emoji={dish.emoji} id={dish.id} size={80} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <T v="headline" numberOfLines={2} style={{ flex: 1, paddingRight: 8 }}>
                {dishName(dish, lang)}
              </T>
              <T v="headline">{money(order.price + order.fee)}</T>
            </View>
            {order.onCredit ? (
              <T v="caption" weight="700" color={colors.warm} style={{ marginTop: 2 }}>
                {t('credit')}
              </T>
            ) : null}
            {!finished ? <ServiceLine order={order} /> : null}
          </View>
        </View>

        {removedNames.length ? (
          <View style={{ marginTop: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.brand }}>
            <T v="footnote" weight="600" color="rgba(255,255,255,0.75)">
              {t('yourDish', { dish: dishName(dish, lang) })}
            </T>
            <T v="title2" color={colors.onBrand} style={{ marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {removedNames.join(' · ')}
            </T>
          </View>
        ) : null}

        {!finished ? (
          <>
            {isToday || available ? <Button label={t('aScanCta')} style={{ marginTop: 14 }} onPress={() => router.push('/scan' as any)} /> : null}
            {canCancel ? (
              <Pressable
                onPress={() => cancel(order.id)}
                style={({ pressed }) => ({ marginTop: 12, height: 44, borderRadius: radius.pill, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
              >
                <T v="subhead" weight="700" color={colors.red}>
                  {t('cancelOrder')}
                </T>
              </Pressable>
            ) : (
              <T v="footnote" color={colors.muted} style={{ marginTop: 12 }}>
                {available ? t('cancelLockedReady') : t('locked')}
              </T>
            )}
          </>
        ) : (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
            <T v="footnote" weight="600" color={order.syncPending ? colors.warm : colors.green}>
              {order.syncPending ? t('receivedPending') : t('received')}
            </T>
            <Rating order={order} />
            {issue ? (
              <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: issue === 'open' ? colors.warmSoft : colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
                <T v="footnote" weight="700" color={issue === 'open' ? colors.warm : colors.green}>
                  {issue === 'open' ? t('issueSent') : issue === 'refunded' ? t('issueRefunded') : t('issueResolved')}
                </T>
              </View>
            ) : ask ? (
              <View style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.warmSoft }}>
                <T v="subhead" color={colors.warm}>
                  {t('issueAsk')}
                </T>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Button label={t('no')} kind="soft" small style={{ flex: 1 }} onPress={() => setAsk(false)} />
                  <Button
                    label={t('issueConfirm')}
                    small
                    style={{ flex: 1.4 }}
                    onPress={() => {
                      reportIssue(order.id);
                      setAsk(false);
                    }}
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setAsk(true)} style={{ marginTop: 12, alignSelf: 'flex-start' }} hitSlop={8}>
                <T v="footnote" weight="600" color={colors.red}>
                  {t('issueReport')}
                </T>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function Orders() {
  const { t, lang } = useI18n();
  const orders = useApp((s) => s.orders);
  const [tab, setTab] = useState<'now' | 'done'>('now');

  const list = orders
    .filter((o) => (tab === 'now' ? o.status === 'ordered' : o.status === 'received'))
    .sort((a, b) => (tab === 'now' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  // Regroupement par jour : un jour peut contenir plusieurs plats.
  const days: { date: string; items: Order[] }[] = [];
  list.forEach((o) => {
    const g = days.find((d) => d.date === o.date);
    if (g) g.items.push(o);
    else days.push({ date: o.date, items: [o] });
  });
  const today = dateKey(new Date());

  return (
    <Screen topPad={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <T v="title" numberOfLines={1} style={{ flex: 1, paddingRight: 12 }}>
          {t('ordersTitle')}
        </T>
        <LangPill />
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'now', label: t('inProgress') },
          { key: 'done', label: t('finished') },
        ]}
      />

      {days.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 }}>
          <T v="title2" align="center">
            {tab === 'now' ? t('noOrders') : t('noFinished')}
          </T>
          {tab === 'now' ? (
            <T v="body" color={colors.muted} align="center" style={{ marginTop: 8 }}>
              {t('noOrdersHint')}
            </T>
          ) : null}
        </View>
      ) : (
        days.map((g) => (
          <View key={g.date} style={{ marginTop: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10, marginLeft: 4 }}>
              <T v="headline">{g.date === today ? t('today') : cap(longDay(g.date, lang).split(' ')[0].replace(',', ''))}</T>
              <T v="subhead" color={colors.muted}>
                {'  '}
                {longDay(g.date, lang).split(' ').slice(1).join(' ')}
              </T>
            </View>
            {g.items.map((o, i) => (
              <OrderRow key={o.id} order={o} finished={tab === 'done'} first={i === 0} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
