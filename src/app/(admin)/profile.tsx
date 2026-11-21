import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Divider, LangPill, Screen, SettingsGroup as Group, SettingsRow as Row, T } from '../../components/ui';
import { cutoffLabel } from '../../lib/data';
import { money } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { useAdmin } from '../../store/admin';
import { useApp, useI18n } from '../../store/app';

/** Profil de l'administrateur : rapport, chiffres des utilisateurs, règles de la cantine, déconnexion. */
export default function AdminProfile() {
  const { t, lang } = useI18n();
  const cutoff = useAdmin((s) => s.cutoff);
  const promoPrice = useAdmin((s) => s.promoPrice);
  const stats = useAdmin((s) => s.stats);
  const creditMax = useAdmin((s) => s.creditMax);
  const creditRate = useAdmin((s) => s.creditRate);
  const user = useApp((s) => s.user);
  const logout = useApp((s) => s.logout);
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  const info = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 }}>
      <T v="body" style={{ flex: 1, paddingRight: 10 }}>
        {label}
      </T>
      <T v="subhead" color={colors.muted}>
        {value}
      </T>
    </View>
  );

  return (
    <Screen topPad={10}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
          <T v="title2" color={colors.onBrand}>
            {initials}
          </T>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <T v="title2">{user.name}</T>
          <T v="subhead" color={colors.muted}>
            {t('aRoleLabel')}
          </T>
        </View>
        <LangPill />
      </View>

      <Group title={t('aManage')}>
        <Row label={t('tabReviews')} onPress={() => router.push('/admin-reviews' as any)} />
        <Divider />
        <Row label={t('aReport')} onPress={() => router.push('/admin-report' as any)} />
      </Group>

      <Group title={t('aUsers')}>
        {info(t('aUsers'), t('aUsersValue', { s: stats.students, p: stats.parents }))}
        <Divider />
        {info(t('aSubs'), String(stats.subscriptions))}
      </Group>

      <Group title={t('aSettings')}>
        <Row label={t('aCutoff')} value={cutoffLabel(lang, cutoff)} onPress={() => router.push('/admin-settings' as any)} />
        <Divider />
        <Row label={t('aPromoTitle')} value={money(promoPrice)} onPress={() => router.push('/admin-settings' as any)} />
        <Divider />
        <Row label={t('aCreditRule')} value={`${creditMax} · +${Math.round(creditRate * 100)} %`} onPress={() => router.push('/admin-settings' as any)} />
        <Divider />
        <Row label={t('changePassword')} onPress={() => router.push('/password' as any)} />
      </Group>

      <Button
        label={t('signOut')}
        kind="danger"
        style={{ marginTop: 32 }}
        onPress={() => {
          logout();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
