import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { Tap } from '../components/fx';
import { Button, Card, Field, T, KeyboardScroll } from '../components/ui';
import { PROMO, cutoffLabel } from '../lib/data';
import { money } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Réglages de la cantine : heure limite de commande (par pas de 15 min, prolongeable) et prix de l'offre annuelle. */
export default function AdminSettings() {
  const { t, lang } = useI18n();
  const cutoff = useAdmin((s) => s.cutoff);
  const setCutoff = useAdmin((s) => s.setCutoff);
  const promoPrice = useAdmin((s) => s.promoPrice);
  const promoFee = useAdmin((s) => s.promoFee);
  const setPromo = useAdmin((s) => s.setPromo);
  const creditMax = useAdmin((s) => s.creditMax);
  const creditRate = useAdmin((s) => s.creditRate);
  const setCredit = useAdmin((s) => s.setCredit);
  const demoMode = useAdmin((s) => s.demoMode);
  const setDemoMode = useAdmin((s) => s.setDemoMode);
  const [price, setPrice] = useState(String(promoPrice));
  const [fee, setFee] = useState(String(promoFee));
  const [saved, setSaved] = useState(false);

  const p = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const f = parseInt(fee.replace(/\D/g, ''), 10) || 0;
  const promoValid = p > 0 && p < PROMO.standardPrice && f > 0;

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
          <T v="subhead" color={colors.muted} style={{ marginTop: 4, marginBottom: 16 }}>
            {t('aPromoHint')}
          </T>
          <Field
            label={t('aPromoPrice')}
            value={price}
            onChangeText={(v) => {
              setPrice(v.replace(/\D/g, ''));
              setSaved(false);
            }}
            keyboardType="number-pad"
          />
          <T v="footnote" color={colors.muted} style={{ marginTop: -6, marginBottom: 14, marginLeft: 4 }}>
            {t('aStandardPrice', { p: money(PROMO.standardPrice) })}
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
          <View style={{ backgroundColor: colors.brandTint, borderRadius: radius.md, padding: 12, marginBottom: 14 }}>
            <T v="subhead">
              {money(p)} / {money(PROMO.standardPrice)} · {money(f)}
            </T>
          </View>
          <Button
            label={t('aPromoSave')}
            disabled={!promoValid}
            onPress={() => {
              setPromo(p, f);
              setSaved(true);
            }}
          />
          {saved ? (
            <T v="footnote" weight="600" color={colors.green} align="center" style={{ marginTop: 10 }}>
              {t('aSaved')}
            </T>
          ) : null}
        </Card>
      </KeyboardScroll>
    </>
  );
}
