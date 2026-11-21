import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Field, Rule, T, KeyboardScroll } from '../components/ui';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export default function Password() {
  const { t } = useI18n();
  const change = useApp((s) => s.changePassword);
  const [old, setOld] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);

  const longEnough = pw.length >= 8;
  const mixed = /[A-Za-z]/.test(pw) && /\d/.test(pw);
  const same = pw.length > 0 && pw === confirm;
  const valid = old.length > 0 && longEnough && mixed && same;

  return (
    <>
      <Stack.Screen options={{ title: t('changePassword') }} />
      <KeyboardScroll style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Field label={t('oldPassword')} value={old} onChangeText={setOld} secure autoCapitalize="none" />
        <Field label={t('newPassword')} value={pw} onChangeText={setPw} secure autoCapitalize="none" />
        <Field label={t('confirmPassword')} value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" />
        <View style={{ marginVertical: 12, marginLeft: 4 }}>
          <Rule ok={longEnough} label={t('rule8')} />
          <Rule ok={mixed} label={t('ruleMix')} />
          <Rule ok={same} label={t('ruleMatch')} />
        </View>
        {saved ? (
          <T v="subhead" color={colors.green} weight="600" style={{ marginBottom: 12, marginLeft: 4 }}>
            {t('passwordChanged')}
          </T>
        ) : null}
        <Button
          label={t('save')}
          disabled={!valid}
          onPress={async () => {
            if (await change(old, pw)) {
              setSaved(true);
              setTimeout(() => router.back(), 900);
            }
          }}
        />
      </KeyboardScroll>
    </>
  );
}
