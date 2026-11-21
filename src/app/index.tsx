import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '../store/app';

export default function Index() {
  const ready = useApp((s) => s.ready);
  const restore = useApp((s) => s.restore);
  const signedIn = useApp((s) => s.signedIn);
  const must = useApp((s) => s.mustChangePassword);
  const role = useApp((s) => s.role);
  useEffect(() => {
    if (!useApp.getState().ready) restore();
  }, [restore]);
  if (!ready) return null;
  if (!signedIn) return <Redirect href="/welcome" />;
  if (must) return <Redirect href="/first-login" />;
  return <Redirect href={(role === 'admin' ? '/(admin)/dashboard' : role === 'parent' ? '/(parent)/overview' : '/(tabs)') as any} />;
}
