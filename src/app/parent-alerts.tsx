import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Card, Chip, T, KeyboardScroll } from '../components/ui';
import { money } from '../lib/i18n';
import { colors, font, noOutline, radius } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

const PRESETS = [1000, 2000, 3000, 5000];

/** Seuil de solde bas du parent (2 000 F par défaut). Le plat à crédit prévient toujours, quel que soit le seuil. */
export default function ParentAlerts() {
  const { t } = useI18n();
  const threshold = useApp((s) => s.lowThreshold);
  const setThreshold = useApp((s) => s.setLowThreshold);
  const [custom, setCustom] = useState('');
  const [picked, setPicked] = useState(threshold);
  const [saved, setSaved] = useState(false);

  const value = custom ? parseInt(custom.replace(/\D/g, ''), 10) || 0 : picked;

  return (
    <>
      <Stack.Screen options={{ title: t('pAlerts') }} />
      <KeyboardScroll style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <T v="subhead" color={colors.muted}>
            {t('pThresholdCurrent')}
          </T>
          <T v="title" style={{ marginTop: 4 }}>
            {money(threshold)}
          </T>
          <T v="footnote" color={colors.muted} style={{ marginTop: 10 }}>
            {t('pAlertsHint')}
          </T>
        </Card>

        <T v="subhead" color={colors.muted} style={{ marginTop: 24, marginBottom: 10 }}>
          {t('amount')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {PRESETS.map((a) => (
            <Chip
              key={a}
              label={money(a)}
              selected={!custom && picked === a}
              onPress={() => {
                setCustom('');
                setPicked(a);
                setSaved(false);
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
              setSaved(false);
            }}
            placeholder={t('otherAmount')}
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            style={{ flex: 1, paddingVertical: 15, fontSize: 17, color: colors.text, ...font('400'), ...noOutline }}
          />
          <T v="body" color={colors.muted}>
            F
          </T>
        </View>

        <T v="footnote" color={colors.muted} style={{ marginTop: 20, marginLeft: 4 }}>
          {t('pAlertsCredit')}
        </T>

        {saved ? (
          <T v="subhead" color={colors.green} weight="600" style={{ marginTop: 16, marginLeft: 4 }}>
            {t('pSaved')}
          </T>
        ) : null}

        <Button
          label={t('save')}
          disabled={value < 0 || value === threshold}
          style={{ marginTop: 20 }}
          onPress={() => {
            setThreshold(value);
            setSaved(true);
            setTimeout(() => router.back(), 800);
          }}
        />
      </KeyboardScroll>
    </>
  );
}
