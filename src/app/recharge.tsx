import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DONE_BAR_ID, DoneBar, PayBox } from '../components/pay';
import { Button, Chip, Segmented, T } from '../components/ui';
import { OfferId, offerById } from '../lib/data';
import { OfferPicker, useOfferName } from '../components/offers';
import { money } from '../lib/i18n';
import { colors, font, radius, noOutline } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

const AMOUNTS = [2000, 5000, 10000, 20000];

/** Recharge de l'élève : montant libre ou offre annuelle. La dette de dépannage est remboursée en premier. */
export default function Recharge() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const debt = useApp((s) => s.debt);
  const balance = useApp((s) => s.balance);
  const recharge = useApp((s) => s.recharge);
  const subscribe = useApp((s) => s.subscribe);
  const uid = useApp((s) => s.uid);
  const active = useApp((s) => (s.uid ? s.subscriptions[s.uid] : undefined));
  const scroll = useRef<any>(null);

  const [offer, setOffer] = useState<OfferId>('week');
  const offerName = useOfferName();
  const [mode, setMode] = useState<'free' | 'offer'>('free');
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState('');
  const [done, setDone] = useState<{ kind: 'topup' | 'offer'; amount: number; offer?: OfferId } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const value = custom ? parseInt(custom.replace(/\D/g, ''), 10) || 0 : amount;
  const payable = mode === 'free' ? value : offerById(offer).fee;
  const canPay = mode === 'free' ? value >= 500 : !active;

  const startConfirm = () => {
    setConfirming(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <View style={{ width: 34, height: 19, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: colors.green, transform: [{ rotate: '-45deg' }, { translateY: -4 }] }} />
        </View>
        <T v="title" align="center">
          {done.kind === 'topup' ? t('rechargeDone', { amount: money(done.amount) }) : t('offerDone', { name: offerName(done.offer ?? offer), pct: offerById(done.offer ?? offer).pct })}
        </T>
        <T v="body" color={colors.muted} align="center" style={{ marginTop: 8, marginBottom: 32 }}>
          {t('balance')} · {money(balance)}
        </T>
        <Button label={t('close')} style={{ alignSelf: 'stretch' }} onPress={() => router.dismiss()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <T v="title">{t('rechargeTitle')}</T>
          <Pressable onPress={() => router.dismiss()} hitSlop={12}>
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
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                inputAccessoryViewID={DONE_BAR_ID}
                style={{ flex: 1, paddingVertical: 15, fontSize: 17, color: colors.text, ...font('400'), ...noOutline }}
              />
              <T v="body" color={colors.muted}>
                F
              </T>
            </View>

            {debt > 0 ? (
              <View style={{ backgroundColor: colors.warmSoft, borderRadius: radius.md, padding: 14, marginTop: 20 }}>
                <T v="subhead" color={colors.warm} weight="500">
                  {t('debtDeducted', { debt: money(debt) })}
                </T>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            <OfferPicker active={active} selected={offer} onSelect={setOffer} />
          </View>
        )}

        <T v="footnote" color={colors.muted} style={{ marginTop: 20 }}>
          {t('paySoon')}
        </T>

        {confirming ? (
          <View style={{ marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line }}>
            <T v="title2">{mode === 'free' ? t('confirmTopupTitle') : offerName(offer)}</T>
            <T v="subhead" color={colors.muted} style={{ marginTop: 4, marginBottom: 14 }}>
              {money(payable)}
            </T>
            <PayBox
              studentId={uid ?? ''}
              amount={payable}
              purpose={mode === 'free' ? 'topup' : 'subscription'}
              offerId={mode === 'offer' ? offer : undefined}
              onFocusField={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 200)}
              onBack={() => setConfirming(false)}
              onPaid={() => setDone(mode === 'free' ? { kind: 'topup', amount: value } : { kind: 'offer', amount: offerById(offer).fee, offer })}
              onDemo={() => {
                if (mode === 'free') {
                  recharge(value);
                  setDone({ kind: 'topup', amount: value });
                } else {
                  if (uid) subscribe(uid, offer);
                  setDone({ kind: 'offer', amount: offerById(offer).fee, offer });
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
            label={mode === 'free' ? t('pay', { amount: money(payable) }) : active ? t('offerRunning') : t('offerChoose', { amount: money(payable) })}
            disabled={!canPay}
            onPress={startConfirm}
          />
        </View>
      ) : null}
      <DoneBar />
    </KeyboardAvoidingView>
  );
}
