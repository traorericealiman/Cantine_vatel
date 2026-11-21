import { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, LangPill, Rule, Screen, T } from '../components/ui';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export default function FirstLogin() {
  const { t } = useI18n();
  const first = useApp((s) => s.user.first);
  const finish = useApp((s) => s.finishFirstLogin);
  const [temp, setTemp] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');

  const longEnough = pw.length >= 8;
  const mixed = /[A-Za-z]/.test(pw) && /\d/.test(pw);
  const same = pw.length > 0 && pw === confirm;
  const valid = temp.length > 0 && longEnough && mixed && same;

  const [wrong, setWrong] = useState(false);
  const submit = async () => {
    if (!valid) return;
    if (!(await finish(temp, pw))) return setWrong(true);
    const role = useApp.getState().role;
    router.replace((role === 'admin' ? '/(admin)/dashboard' : role === 'parent' ? '/(parent)/overview' : '/allergies?onboarding=1') as any);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <Screen backdrop={false} background={colors.bg} topPad={12} bottomPad={40}>
        <View style={{ alignItems: 'flex-end' }}>
          <LangPill />
        </View>
        <View style={{ marginTop: 32, marginBottom: 32 }}>
          <T v="largeTitle">{t('firstTitle')}</T>
          <T v="body" color={colors.muted} style={{ marginTop: 8 }}>
            {first}, {t('firstSub').charAt(0).toLowerCase() + t('firstSub').slice(1)}
          </T>
        </View>

        <Field label={t('tempPassword')} value={temp} onChangeText={setTemp} secure autoCapitalize="none" />
        <Field label={t('newPassword')} value={pw} onChangeText={setPw} secure autoCapitalize="none" />
        <Field label={t('confirmPassword')} value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" onSubmitEditing={submit} />

        <View style={{ marginVertical: 12, marginLeft: 4 }}>
          <Rule ok={longEnough} label={t('rule8')} />
          <Rule ok={mixed} label={t('ruleMix')} />
          <Rule ok={same} label={t('ruleMatch')} />
        </View>

        {wrong ? (
          <T v="subhead" color={colors.red} style={{ marginLeft: 4 }}>
            {t('loginError')}
          </T>
        ) : null}
        <Button label={t('continue')} onPress={submit} disabled={!valid} style={{ marginTop: 12 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
