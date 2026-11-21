import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Button, T } from '../components/ui';
import { dateKey } from '../lib/data';
import { longDay } from '../lib/i18n';
import { colors, radius, shadow } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** QR code unique du comptoir : à imprimer ou afficher ; tous les élèves le scannent en prenant leur plat. */
export default function AdminQr() {
  const { t, lang } = useI18n();
  const token = useAdmin((s) => s.qrToken);
  const at = useAdmin((s) => s.qrGeneratedAt);
  const regenerate = useAdmin((s) => s.regenerateQr);
  const loadQr = useAdmin((s) => s.loadQr);
  useEffect(() => {
    loadQr();
  }, [loadQr]);

  return (
    <>
      <Stack.Screen options={{ title: t('aQrTitle') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
        <T v="subhead" color={colors.muted} align="center" style={{ marginBottom: 20 }}>
          {t('aQrSub')}
        </T>
        <View style={{ padding: 24, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadow, shadowOpacity: 0.1 }}>
          {token ? <QRCode value={token} size={240} color={colors.brand} backgroundColor={colors.white} /> : <View style={{ width: 240, height: 240 }} />}
        </View>
        <T v="headline" style={{ marginTop: 18, letterSpacing: 1 }}>
          {token}
        </T>
        <T v="footnote" color={colors.muted} style={{ marginTop: 4 }}>
          {t('aQrSince', { date: longDay(dateKey(new Date(at)), lang) })}
        </T>
        <T v="subhead" align="center" style={{ marginTop: 18 }}>
          {t('aQrHint')}
        </T>
        <Button label={t('aQrRegenerate')} kind="soft" style={{ marginTop: 24, alignSelf: 'stretch' }} onPress={regenerate} />
        <T v="footnote" color={colors.warm} align="center" style={{ marginTop: 8 }}>
          {t('aQrWarn')}
        </T>
      </ScrollView>
    </>
  );
}
