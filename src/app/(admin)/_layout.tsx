import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { Key } from '../../lib/i18n';
import { startAdminLive, stopAdminLive, useAdmin } from '../../store/admin';
import { useApp } from '../../store/app';

// Espace administrateur : cinq onglets en texte (pilotage, service du jour, menus, stocks, profil).
const LABELS: Record<string, Key> = {
  dashboard: 'tabHome',
  service: 'tabService',
  menus: 'tabMenus',
  stocks: 'tabStocks',
  profile: 'tabProfile',
};

const hrefFor = (name: string) => `/(admin)/${name}`;

export default function AdminLayout() {
  const signedIn = useApp((s) => s.signedIn);
  const role = useApp((s) => s.role);
  const loadAll = useAdmin((s) => s.loadAll);
  useEffect(() => {
    if (!signedIn || role !== 'admin') return;
    loadAll();
    startAdminLive();
    const timer = setInterval(loadAll, 30000);
    return () => {
      clearInterval(timer);
      stopAdminLive();
    };
  }, [signedIn, role, loadAll]);
  if (!signedIn) return <Redirect href="/login" />;
  if (role === 'parent') return <Redirect href={'/(parent)/overview' as any} />;
  if (role !== 'admin') return <Redirect href="/(tabs)" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} labels={LABELS} hrefFor={hrefFor} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="menus" />
      <Tabs.Screen name="stocks" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
