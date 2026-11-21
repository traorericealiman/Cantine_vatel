import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Card, T } from '../components/ui';
import { colors } from '../lib/theme';
import { TxRow } from '../components/TxRow';
import { useApp, useI18n } from '../store/app';

export default function History() {
  const { t } = useI18n();
  const txs = useApp((s) => s.txs);
  const list = [...txs].sort((a, b) => b.at - a.at);
  return (
    <>
      <Stack.Screen options={{ title: t('history') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Card padded={false}>
          {list.length === 0 ? (
            <T v="subhead" color={colors.muted} style={{ padding: 18 }}>
              {t('noTx')}
            </T>
          ) : (
            list.map((tx, i) => <TxRow key={tx.id} tx={tx} last={i === list.length - 1} />)
          )}
        </Card>
      </ScrollView>
    </>
  );
}
