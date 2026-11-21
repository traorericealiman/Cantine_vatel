import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ERRORS, Role, User, UsersData, genPassword, users } from '../api';

const ROLE_LABEL: Record<Role, string> = { student: 'Élève', parent: 'Parent', admin: 'Administrateur' };
type Filter = 'all' | 'student' | 'parent';

const money = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;
const msg = (e: unknown) => ERRORS[(e as Error).message] ?? (e as Error).message;

interface Created {
  login: string;
  password: string;
  what: string;
}

/** Gestion des comptes : création avec mot de passe par défaut, réinitialisation, liens parent-élève. */
export default function Users() {
  const [data, setData] = useState<UsersData | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [manage, setManage] = useState<User | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setData(await users<UsersData>({ action: 'list' }));
      setError('');
    } catch (e) {
      setError(msg(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => new Map((data?.users ?? []).map((u) => [u.id, u])), [data]);
  const students = (data?.users ?? []).filter((u) => u.role === 'student');
  const shown = (data?.users ?? [])
    .filter((u) => (filter === 'all' ? true : u.role === filter))
    .filter((u) => `${u.login} ${u.full_name}`.toLowerCase().includes(query.toLowerCase()));

  const linksOf = (u: User) =>
    (data?.links ?? [])
      .filter((l) => (u.role === 'parent' ? l.parent_id === u.id : l.student_id === u.id))
      .map((l) => byId.get(u.role === 'parent' ? l.student_id : l.parent_id))
      .filter((x): x is User => !!x);

  const reset = async (u: User) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.full_name} ? L’ancien mot de passe ne marchera plus.`)) return;
    try {
      const r = await users<{ password: string }>({ action: 'reset', id: u.id });
      setCreated({ login: u.login, password: r.password, what: 'Mot de passe réinitialisé' });
      load();
    } catch (e) {
      setError(msg(e));
    }
  };

  return (
    <>
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="seg">
            {(['all', 'student', 'parent'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'Tous' : f === 'student' ? 'Élèves' : 'Parents'}
              </button>
            ))}
          </div>
          <input className="input search" placeholder="Rechercher un nom ou un identifiant" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn" onClick={() => setCreating(true)}>
          + Nouvel utilisateur
        </button>
      </div>

      {created ? (
        <div className="notice">
          <strong>{created.what}.</strong> Communique ces identifiants à la personne (elle devra choisir un nouveau mot de passe à sa première connexion) :
          <div className="row" style={{ marginTop: 8 }}>
            <span>
              Identifiant <code>{created.login}</code>
            </span>
            <span>
              Mot de passe <code>{created.password}</code>
            </span>
            <button className="btn soft small" onClick={() => navigator.clipboard?.writeText(`Identifiant : ${created.login}\nMot de passe : ${created.password}`)}>
              Copier
            </button>
            <button className="btn soft small" onClick={() => setCreated(null)}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}
      {error ? <div className="error">{error}</div> : null}

      <div className="card flush">
        <table className="users">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Classe</th>
              <th>Solde</th>
              <th>Liens</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const w = data?.wallets.find((x) => x.student_id === u.id);
              const links = linksOf(u);
              return (
                <tr key={u.id}>
                  <td data-label="Identifiant">
                    <strong>{u.login}</strong>
                  </td>
                  <td data-label="Nom">{u.full_name}</td>
                  <td data-label="Rôle">
                    <span className={`badge ${u.role === 'admin' ? 'warm' : ''}`}>{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="muted" data-label="Classe">{u.class_name ?? '—'}</td>
                  <td data-label="Solde">{u.role === 'student' && w ? <>{money(w.balance)}{w.debt > 0 ? <span className="badge warm" style={{ marginLeft: 6 }}>dette {money(w.debt)}</span> : null}</> : <span className="muted">—</span>}</td>
                  <td className="muted" data-label="Liens">{links.length ? links.map((l) => l.first_name).join(', ') : u.role === 'admin' ? '—' : 'aucun'}</td>
                  <td data-label="Statut">{u.must_change_password ? <span className="badge warm">Mot de passe provisoire</span> : <span className="badge green">Actif</span>}</td>
                  <td className="actions">
                    {u.role !== 'admin' ? (
                      <>
                        <button className="btn soft small" onClick={() => setManage(u)}>
                          Liens
                        </button>{' '}
                        <button className="btn soft small" onClick={() => reset(u)}>
                          Mot de passe
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!shown.length ? (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                  {data ? 'Aucun utilisateur.' : 'Chargement…'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {creating ? (
        <CreateForm
          students={students}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setCreated({ ...c, what: 'Compte créé' });
            load();
          }}
        />
      ) : null}
      {manage ? <LinksPanel user={manage} data={data!} byId={byId} onClose={() => setManage(null)} onChange={load} /> : null}
    </>
  );
}

function CreateForm({ students, onClose, onCreated }: { students: User[]; onClose: () => void; onCreated: (c: { login: string; password: string }) => void }) {
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [password, setPassword] = useState(genPassword());
  const [linked, setLinked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await users<{ login: string; password: string }>({ action: 'create', role, login, fullName, className, password, students: role === 'parent' ? linked : [] });
      onCreated(r);
    } catch (err) {
      setError(msg(err));
    }
    setBusy(false);
  };

  return (
    <div className="panel" onClick={onClose}>
      <form className="card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Nouvel utilisateur</h2>
        <div className="seg" style={{ marginBottom: 16 }}>
          <button type="button" className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>
            Élève
          </button>
          <button type="button" className={role === 'parent' ? 'on' : ''} onClick={() => setRole('parent')}>
            Parent
          </button>
        </div>
        <label className="field">
          <span>{role === 'student' ? 'Matricule (identifiant de connexion)' : 'Identifiant de connexion'}</span>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder={role === 'student' ? 'VAT-26-0001' : 'parent.nom'} autoFocus />
        </label>
        <label className="field">
          <span>Nom complet</span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aya Koffi" />
        </label>
        {role === 'student' ? (
          <label className="field">
            <span>Classe (facultatif)</span>
            <input className="input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Bachelor 2" />
          </label>
        ) : (
          <div className="field">
            <span>Enfants à rattacher (facultatif)</span>
            <div className="checks">
              {students.map((s) => (
                <label key={s.id}>
                  <input type="checkbox" checked={linked.includes(s.id)} onChange={() => setLinked((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id]))} />
                  {s.full_name} <span className="muted">({s.login})</span>
                </label>
              ))}
              {!students.length ? <span className="muted">Aucun élève pour l’instant.</span> : null}
            </div>
          </div>
        )}
        <label className="field">
          <span>Mot de passe par défaut (8 caractères minimum)</span>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn soft small" onClick={() => setPassword(genPassword())}>
              Générer
            </button>
          </div>
        </label>
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          La personne devra choisir un nouveau mot de passe à sa première connexion.
        </p>
        {error ? <div className="error">{error}</div> : null}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn soft" onClick={onClose}>
            Annuler
          </button>
          <button className="btn" disabled={busy || login.trim().length < 3 || fullName.trim().length < 2 || password.length < 8}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LinksPanel({ user, data, byId, onClose, onChange }: { user: User; data: UsersData; byId: Map<string, User>; onClose: () => void; onChange: () => void }) {
  const isParent = user.role === 'parent';
  const linked = data.links
    .filter((l) => (isParent ? l.parent_id === user.id : l.student_id === user.id))
    .map((l) => byId.get(isParent ? l.student_id : l.parent_id))
    .filter((x): x is User => !!x);
  const candidates = data.users.filter((u) => u.role === (isParent ? 'student' : 'parent') && !linked.some((l) => l.id === u.id));
  const [pick, setPick] = useState('');
  const [error, setError] = useState('');

  const call = async (action: 'link' | 'unlink', other: string) => {
    setError('');
    try {
      await users({ action, parentId: isParent ? user.id : other, studentId: isParent ? other : user.id });
      setPick('');
      onChange();
    } catch (e) {
      setError(msg(e));
    }
  };

  return (
    <div className="panel" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>
          {isParent ? 'Enfants de' : 'Parents de'} {user.full_name}
        </h2>
        {linked.length ? (
          <table>
            <tbody>
              {linked.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.full_name}</strong> <span className="muted">({l.login})</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn danger small" onClick={() => call('unlink', l.id)}>
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Aucun lien pour l’instant.</p>
        )}
        <div className="row" style={{ marginTop: 16, flexWrap: 'nowrap' }}>
          <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{isParent ? 'Rattacher un élève…' : 'Rattacher un parent…'}</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.login})
              </option>
            ))}
          </select>
          <button className="btn" disabled={!pick} onClick={() => call('link', pick)}>
            Ajouter
          </button>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn soft" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
