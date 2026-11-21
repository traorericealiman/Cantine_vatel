import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { Tap } from '../components/fx';
import { Button, Card, Field, T, KeyboardScroll } from '../components/ui';
import { EXAMPLE_PRICE, Offer, cutoffLabel, discounted } from '../lib/data';
import { money } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

const OFFER_NAME = { week: 'offerWeek', month: 'offerMonth', year: 'offerYear' } as const;

/** Prix de l'abonnement d'une offre (semaine, mois ou année) ; la réduction est fixe et indiquée en exemple. */
function OfferFee({ offer }: { offer: Offer }) {
  const { t } = useI18n();
  const setOffer = useAdmin((s) => s.setOffer);
  const [fee, setFee] = useState(String(offer.fee));
  const [saved, setSaved] = useState(false);
  const value = parseInt(fee.replace(/\D/g, ''), 10) || 0;
  return (
    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
      <T v="headline">{t(OFFER_NAME[offer.id])} · −{offer.pct} %</T>
      <T v="footnote" color={colors.muted} style={{ marginTop: 2, marginBottom: 10 }}>
        {t('offerExample', { full: money(EXAMPLE_PRICE), price: money(discounted(EXAMPLE_PRICE, offer.pct)) })}
      </T>
      <Field
        label={t('aPromoFee')}
        value={fee}
        onChangeText={(v) => {
          setFee(v.replace(/\D/g, ''));
          setSaved(false);
        }}
        keyboardType="number-pad"
      />
      <Button
        label={saved ? t('aSaved') : t('aPromoSave')}
        kind={saved ? 'soft' : 'primary'}
        disabled={value <= 0}
        onPress={() => {
          setOffer(offer.id, { fee: value });
          setSaved(true);
        }}
      />
    </View>
  );
}

/** Réglages de la cantine : heure limite de commande (par pas de 15 min, prolongeable), règle du crédit, offres. */
export default function AdminSettings() {
  const { t, lang } = useI18n();
  const cutoff = useAdmin((s) => s.cutoff);
  const setCutoff = useAdmin((s) => s.setCutoff);
  const offers = useAdmin((s) => s.offers);
  const creditMax = useAdmin((s) => s.creditMax);
  const creditRate = useAdmin((s) => s.creditRate);
  const setCredit = useAdmin((s) => s.setCredit);
  const demoMode = useAdmin((s) => s.demoMode);
  const setDemoMode = useAdmin((s) => s.setDemoMode);
  const step = (label: string, onPress: () => void) => (
    <Tap
      onPress={onPress}
      scale={0.9}
      style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}
    >
      <T style={{ fontSize: 26, lineHeight: 30, fontWeight: '600' }}>{label}</T>
    </Tap>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('aSettingsTitle') }} />
      <KeyboardScroll style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <T v="headline">{t('aCutoff')}</T>
          <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
            {t('aCutoffHint')}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            {step('−', () => setCutoff(cutoff - 15))}
            <T style={{ fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.6 }}>{cutoffLabel(lang, cutoff)}</T>
            {step('+', () => setCutoff(cutoff + 15))}
          </View>
          <Button label={t('aExtend')} kind="soft" small style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setCutoff(cutoff + 30)} />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <T v="headline">{t('aCreditRule')}</T>
          <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
            {t('aCreditRuleHint')}
          </T>
          <T v="footnote" weight="600" color={colors.muted} style={{ marginTop: 16, marginLeft: 4 }}>
            {t('aCreditMax')}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            {step('−', () => setCredit(creditMax - 1, creditRate))}
            <T style={{ fontSize: 40, lineHeight: 48, fontWeight: '700' }}>{creditMax}</T>
            {step('+', () => setCredit(creditMax + 1, creditRate))}
          </View>
          <T v="footnote" weight="600" color={colors.muted} style={{ marginTop: 18, marginLeft: 4 }}>
            {t('aCreditFee')}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            {step('−', () => setCredit(creditMax, creditRate - 0.05))}
            <T style={{ fontSize: 40, lineHeight: 48, fontWeight: '700' }}>{Math.round(creditRate * 100)} %</T>
            {step('+', () => setCredit(creditMax, creditRate + 0.05))}
          </View>
        </Card>

        <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T v="headline">{t('aDemoMode')}</T>
            <T v="footnote" color={colors.muted} style={{ marginTop: 2 }}>
              {t('aDemoHint')}
            </T>
          </View>
          <Switch value={demoMode} onValueChange={setDemoMode} trackColor={{ true: colors.brand, false: '#CBD5E1' }} thumbColor={colors.white} />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <T v="headline">{t('aPromoTitle')}</T>
          <T v="subhead" color={colors.muted} style={{ marginTop: 4, marginBottom: 6 }}>
            {t('aPromoHint')}
          </T>
          {offers.map((o) => (
            <OfferFee key={o.id} offer={o} />
          ))}
        </Card>
      </KeyboardScroll>
    </>
  );
}
