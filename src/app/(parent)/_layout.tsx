import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { Key } from '../../lib/i18n';
import { useApp } from '../../store/app';

// Espace parent : trois onglets en texte, sans bouton central (le parent ne commande pas).
const LABELS: Record<string, Key> = {
  overview: 'tabHome',
  activity: 'tabActivity',
  account: 'tabProfile',
};

const hrefFor = (name: string) => `/(parent)/${name}`;

export default function ParentLayout() {
  const signedIn = useApp((s) => s.signedIn);
  const role = useApp((s) => s.role);
  if (!signedIn) return <Redirect href="/login" />;
  if (role === 'admin') return <Redirect href={'/(admin)/dashboard' as any} />;
  if (role !== 'parent') return <Redirect href="/(tabs)" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} labels={LABELS} hrefFor={hrefFor} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="overview" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
