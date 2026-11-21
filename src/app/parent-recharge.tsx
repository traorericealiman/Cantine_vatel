import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DONE_BAR_ID, DoneBar, PayBox } from '../components/pay';
import { Button, Card, Chip, Segmented, Tag, T } from '../components/ui';
import { PROMO } from '../lib/data';
import { money } from '../lib/i18n';
import { colors, font, noOutline, radius } from '../lib/theme';
import { CHILDREN, useApp, useChildWallet, useI18n } from '../store/app';

const AMOUNTS = [2000, 5000, 10000, 20000];

/** Recharge du wallet d'un enfant par son parent : montant libre ou offre promotionnelle. La dette passe en premier. */
export default function ParentRecharge() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ child?: string; tab?: string }>();
  const selected = useApp((s) => s.selectedChild);
  const child = CHILDREN.find((c) => c.id === (params.child ?? selected)) ?? CHILDREN[0];
  const wallet = useChildWallet(child.id);
  const subscribed = useApp((s) => !!s.subscriptions[child.id]);
  const rechargeChild = useApp((s) => s.rechargeChild);
  const subscribe = useApp((s) => s.subscribe);

  const scroll = useRef<any>(null);
  const [mode, setMode] = useState<'free' | 'offer'>(params.tab === 'offer' ? 'offer' : 'free');
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<{ kind: 'topup' | 'offer'; amount: number } | null>(null);

  const value = custom ? parseInt(custom.replace(/\D/g, ''), 10) || 0 : amount;
  const payable = mode === 'free' ? value : PROMO.fee;
  const canPay = mode === 'free' ? value >= 500 : !subscribed;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <View style={{ width: 34, height: 19, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: colors.green, transform: [{ rotate: '-45deg' }, { translateY: -4 }] }} />
        </View>
        <T v="title" align="center">
          {done.kind === 'topup'
            ? t('pRechargeDone', { name: child.first, amount: money(done.amount) })
            : t('pSubscribedDone', { name: child.first })}
        </T>
        <T v="body" color={colors.muted} align="center" style={{ marginTop: 8, marginBottom: 32 }}>
          {t('balance')} · {money(wallet.balance)}
        </T>
        <Button label={t('close')} style={{ alignSelf: 'stretch' }} onPress={() => router.dismiss()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <T v="title" style={{ flex: 1, paddingRight: 12 }}>
            {t('pRechargeTitle', { name: child.first })}
          </T>
          <Pressable onPress={() => router.dismiss()} hitSlop={12} style={{ paddingTop: 6 }}>
            <T v="body" weight="600" color={colors.brandText}>
              {t('close')}
            </T>
          </Pressable>
        </View>

        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setConfirming(false);
          }}
          options={[
            { key: 'free', label: t('pFree') },
            { key: 'offer', label: t('pOffers') },
          ]}
        />

        {mode === 'free' ? (
          <View style={{ marginTop: 22 }}>
            <T v="subhead" color={colors.muted} style={{ marginBottom: 10 }}>
              {t('amount')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {AMOUNTS.map((a) => (
                <Chip
                  key={a}
                  label={money(a)}
                  selected={!custom && amount === a}
                  onPress={() => {
                    setCustom('');
                    setAmount(a);
                    setConfirming(false);
                  }}
                />
              ))}
            </View>

            <View
              style={{
                marginTop: 18,
                backgroundColor: colors.card,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: custom ? colors.brand : colors.line,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={custom}
                onChangeText={(v) => {
                  setCustom(v.replace(/\D/g, ''));
                  setConfirming(false);
                }}
                placeholder={t('otherAmount')}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                inputAccessoryViewID={DONE_BAR_ID}
                style={{ flex: 1, paddingVertical: 15, fontSize: 17, color: colors.text, ...font('400'), ...noOutline }}
              />
              <T v="body" color={colors.muted}>
                F
              </T>
            </View>

            {wallet.debt > 0 ? (
              <View style={{ backgroundColor: colors.warmSoft, borderRadius: radius.md, padding: 14, marginTop: 20 }}>
                <T v="subhead" color={colors.warm} weight="500">
                  {t('pDebtDeducted', { debt: money(wallet.debt) })}
                </T>
              </View>
            ) : null}

            <T v="footnote" color={colors.muted} style={{ marginTop: 20 }}>
              {t('paySoon')}
            </T>
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            <Card>
              {subscribed ? <Tag label={t('pSubscribed')} tone="green" /> : <Tag label={t('promoTag')} />}
              <T v="title2" style={{ marginTop: 12 }}>
                {t('pOfferName')}
              </T>
              <T v="callout" color={colors.muted} style={{ marginTop: 6 }}>
                {t('pOfferBody')}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 16 }}>
                <T v="title2">{money(PROMO.dishPrice)}</T>
                <T v="subhead" color={colors.muted} style={{ marginLeft: 8, textDecorationLine: 'line-through' }}>
                  {money(PROMO.standardPrice)}
                </T>
              </View>
              <T v="subhead" weight="600" style={{ marginTop: 10 }}>
                {t('pOfferFee', { amount: money(PROMO.fee) })}
              </T>
            </Card>
            <T v="footnote" color={colors.muted} style={{ marginTop: 14, marginLeft: 4 }}>
              {t('pOfferNote')}
            </T>
            <T v="footnote" color={colors.muted} style={{ marginTop: 10, marginLeft: 4 }}>
              {t('paySoon')}
            </T>
          </View>
        )}
        {confirming ? (
          <View style={{ marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line }}>
            <T v="title2">{t('confirmTopupTitle')}</T>
            <T v="subhead" color={colors.muted} style={{ marginTop: 4, marginBottom: 14 }}>
              {mode === 'free'
                ? t('pConfirmTopupSub', { amount: money(payable), name: child.first })
                : t('pConfirmOfferSub', { amount: money(payable), name: child.first })}
            </T>
            <PayBox
              studentId={child.id}
              amount={payable}
              purpose={mode === 'free' ? 'topup' : 'subscription'}
              onFocusField={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 200)}
              onBack={() => setConfirming(false)}
              onPaid={() => setDone(mode === 'free' ? { kind: 'topup', amount: value } : { kind: 'offer', amount: PROMO.fee })}
              onDemo={() => {
                if (mode === 'free') {
                  rechargeChild(child.id, value);
                  setDone({ kind: 'topup', amount: value });
                } else {
                  subscribe(child.id);
                  setDone({ kind: 'offer', amount: PROMO.fee });
                }
              }}
            />
          </View>
        ) : null}
      </ScrollView>

      {!confirming ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <Button
            label={mode === 'free' ? t('pay', { amount: money(payable) }) : subscribed ? t('pSubscribed') : t('pSubscribe', { amount: money(payable) })}
            disabled={!canPay}
            onPress={() => {
              setConfirming(true);
              setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
            }}
          />
        </View>
      ) : null}
      <DoneBar />
    </KeyboardAvoidingView>
  );
}
