import { useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import { Button, Chip, T } from './ui';
import { SETTINGS } from '../lib/data';
import { PAY_METHODS, PayMethod, payWithJeko } from '../lib/pay';
import { colors, font, noOutline, radius } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export const DONE_BAR_ID = 'doneBar';

/** Barre « Terminé » au-dessus du clavier numérique (iPhone) : sans elle, le clavier ne se ferme pas. */
export function DoneBar() {
  const { t } = useI18n();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={{ backgroundColor: '#F1F5F9', borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
          <T v="body" weight="700" color={colors.brandText}>
            {t('keyboardDone')}
          </T>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/**
 * Choix du moyen de paiement Mobile Money (Jèko), numéro du payeur, puis paiement et attente de confirmation.
 * « Recharge de démonstration » ajoute les crédits sans payer (test uniquement, à retirer avant la production).
 */
export function PayBox({
  studentId,
  amount,
  purpose = 'topup',
  offerId,
  onBack,
  onPaid,
  onDemo,
  onFocusField,
}: {
  studentId: string;
  amount: number;
  purpose?: 'topup' | 'subscription';
  offerId?: string;
  onBack: () => void;
  onPaid: () => void;
  onDemo: () => void;
  onFocusField?: () => void;
}) {
  const { t } = useI18n();
  const [method, setMethod] = useState<PayMethod>('wave');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'waiting' | 'failed'>('idle');
  const refresh = useApp((s) => s.refresh);

  const pay = async () => {
    setState('waiting');
    const r = await payWithJeko({ studentId, amount, method, phone: phone.replace(/\s/g, ''), purpose, offerId });
    if (r === 'success') {
      await refresh();
      onPaid();
    } else setState('failed');
  };

  if (state === 'waiting') {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <T v="title2" align="center">
          {t('payWaiting')}
        </T>
        <T v="subhead" color={colors.muted} align="center" style={{ marginTop: 6 }}>
          {t('payWaitingSub')}
        </T>
      </View>
    );
  }

  return (
    <>
      <T v="subhead" color={colors.muted} style={{ marginBottom: 8 }}>
        {t('payMethod')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PAY_METHODS.map((m) => (
          <Chip key={m.id} label={m.label} selected={method === m.id} onPress={() => setMethod(m.id)} />
        ))}
      </View>
      <View style={{ marginTop: 12, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16 }}>
        <TextInput
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/[^\d+ ]/g, ''))}
          placeholder={t('payPhone')}
          placeholderTextColor="#64748B"
          keyboardType="phone-pad"
          inputAccessoryViewID={DONE_BAR_ID}
          onFocus={onFocusField}
          style={{ paddingVertical: 14, fontSize: 16, color: colors.text, ...font('400'), ...noOutline }}
        />
      </View>
      <T v="footnote" color={colors.muted} style={{ marginTop: 6, marginLeft: 4 }}>
        {t('payPhoneHint')}
      </T>
      {state === 'failed' ? (
        <T v="subhead" color={colors.red} style={{ marginTop: 8, marginLeft: 4 }}>
          {t('payFailed')}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button label={t('back')} kind="soft" style={{ flex: 1 }} onPress={onBack} />
        <Button label={t('confirm')} style={{ flex: 1.4 }} onPress={pay} />
      </View>
      {SETTINGS.demo ? (
        <Pressable onPress={onDemo} style={{ alignItems: 'center', paddingTop: 12 }}>
          <T v="footnote" weight="600" color={colors.muted}>
            {t('payDemo')}
          </T>
        </Pressable>
      ) : null}
    </>
  );
}
