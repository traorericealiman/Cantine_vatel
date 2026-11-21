import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Divider, LangPill, Screen, SettingsGroup as Group, SettingsRow as Row, T } from '../../components/ui';
import { money } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import { CHILDREN, useApp, useI18n } from '../../store/app';

export default function ParentAccount() {
  const { t } = useI18n();
  const user = useApp((s) => s.user);
  const threshold = useApp((s) => s.lowThreshold);
  const logout = useApp((s) => s.logout);

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  return (
    <Screen topPad={10} fixedHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <T v="title">{t('profileTitle')}</T>
        <LangPill />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
          <T v="title2" color={colors.onBrand}>
            {initials}
          </T>
        </View>
        <View style={{ marginLeft: 16 }}>
          <T v="title2">{user.name}</T>
          <T v="subhead" color={colors.muted}>
            {t('pRoleLabel')} · {user.matricule}
          </T>
        </View>
      </View>

      <Group title={t('pLinked')}>
        {CHILDREN.map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <Divider /> : null}
            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <T v="body">{c.name}</T>
              <T v="footnote" color={colors.muted}>
                {c.matricule}
              </T>
            </View>
          </View>
        ))}
      </Group>

      <Group title={t('account')}>
        <Row label={t('pAlerts')} value={money(threshold)} onPress={() => router.push('/parent-alerts' as any)} />
        <Divider />
        <Row label={t('changePassword')} onPress={() => router.push('/password' as any)} />
      </Group>

      <Group title={t('help')}>
        <Row label={t('faq')} onPress={() => router.push('/faq' as any)} />
        <Divider />
        <Row label={t('rateApp')} onPress={() => router.push('/feedback' as any)} />
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
