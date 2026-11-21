import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';

type Page = 'kpi' | 'users';

/** Administration générale : tableau de bord (KPI) et gestion des utilisateurs. */
export default function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [page, setPage] = useState<Page>('kpi');

  // Session enregistrée : on vérifie qu'elle appartient bien à un administrateur.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
        if (p?.role === 'admin') setSignedIn(true);
        else await supabase.auth.signOut();
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!signedIn) return <Login onDone={() => setSignedIn(true)} />;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <h1>Cantine de Vatel</h1>
          <span>Administration générale</span>
        </div>
        <div className="tabs">
          <button className={`tab ${page === 'kpi' ? 'on' : ''}`} onClick={() => setPage('kpi')}>
            Tableau de bord
          </button>
          <button className={`tab ${page === 'users' ? 'on' : ''}`} onClick={() => setPage('users')}>
            Utilisateurs
          </button>
        </div>
        <button
          className="btn soft small"
          onClick={async () => {
            await supabase.auth.signOut();
            setSignedIn(false);
          }}
        >
          Se déconnecter
        </button>
      </div>
      {page === 'kpi' ? <Dashboard /> : <Users />}
    </div>
  );
}
