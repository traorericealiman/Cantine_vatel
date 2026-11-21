import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { Key } from '../../lib/i18n';
import { useApp } from '../../store/app';

const LABELS: Record<string, Key> = {
  index: 'tabHome',
  orders: 'tabOrders',
  favorites: 'tabFavorites',
  profile: 'tabProfile',
};

const hrefFor = (name: string) => (name === 'index' ? '/(tabs)' : `/(tabs)/${name}`);

export default function TabsLayout() {
  const signedIn = useApp((s) => s.signedIn);
  const role = useApp((s) => s.role);
  const allergiesDone = useApp((s) => s.allergiesDone);
  if (!signedIn) return <Redirect href="/login" />;
  if (role === 'parent') return <Redirect href={'/(parent)/overview' as any} />;
  if (role === 'admin') return <Redirect href={'/(admin)/dashboard' as any} />;
  if (!allergiesDone) return <Redirect href={'/allergies?onboarding=1' as any} />;
  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} labels={LABELS} hrefFor={hrefFor} center="favorites" />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="favorites" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
}
