import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, T, KeyboardScroll } from '../components/ui';
import { colors, font, noOutline, radius } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export default function Feedback() {
  const { t } = useI18n();
  const parent = useApp((s) => s.role) === 'parent';
  const studentVote = useApp((s) => s.appVote);
  const parentVote = useApp((s) => s.parentAppVote);
  const setStudentVote = useApp((s) => s.setAppVote);
  const setParentVote = useApp((s) => s.setParentAppVote);
  const sendFeedback = useApp((s) => s.sendFeedback);
  const vote = parent ? parentVote : studentVote;
  const setVote = parent ? setParentVote : setStudentVote;
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const choice = (v: 1 | -1) => {
    const on = vote === v;
    const tone = v === 1 ? colors.green : colors.red;
    return (
      <Pressable
        onPress={() => setVote(v)}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: 18,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: tone,
          backgroundColor: on ? tone : colors.card,
        }}
      >
        <T style={{ fontSize: 30, lineHeight: 40 }}>{v === 1 ? '👍' : '👎'}</T>
        <T v="subhead" weight="600" color={on ? colors.onBrand : tone} style={{ marginTop: 6 }}>
          {v === 1 ? t('appGood') : t('appBad')}
        </T>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t('rateApp') }} />
      <KeyboardScroll style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T v="title2">{parent ? t('pRateTitle') : t('rateTitle')}</T>
        <T v="subhead" color={colors.muted} style={{ marginTop: 6, marginBottom: 20 }}>
          {parent ? t('pRateSub') : t('rateSub')}
        </T>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {choice(1)}
          {choice(-1)}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('feedbackPlaceholder')}
          placeholderTextColor="#64748B"
          multiline
          style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, minHeight: 120, fontSize: 16, color: colors.text, textAlignVertical: 'top', ...font('400'), ...noOutline }}
        />
        {sent ? (
          <T v="subhead" color={colors.green} weight="600" style={{ marginTop: 14 }}>
            {parent ? t('pThanks') : t('thanks')}
          </T>
        ) : null}
        <Button
          label={t('send')}
          style={{ marginTop: 20 }}
          disabled={!vote && !note.trim()}
          onPress={() => {
            sendFeedback(note);
            setSent(true);
            setTimeout(() => router.back(), 900);
          }}
        />
      </KeyboardScroll>
    </>
  );
}
