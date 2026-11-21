import { FormEvent, useEffect, useState } from 'react';
import { signIn } from '../api';

// Photos des plats de la cantine (diaporama de la page de connexion).
const SLIDES = [
  { src: '/dishes/garba.jpg', name: 'Garba', line: 'Le plat préféré du midi' },
  { src: '/dishes/tcheb.jpg', name: 'Tchèp', line: 'Riz et poisson, fait maison' },
  { src: '/dishes/poulet.jpg', name: 'Poulet braisé alloco', line: 'Braisé, doré, généreux' },
  { src: '/dishes/att-poisson.jpg', name: 'Attiéké poisson', line: 'Une valeur sûre de la semaine' },
  { src: '/dishes/sauce-graine.jpg', name: 'Riz sauce graine', line: 'La sauce qui fait revenir' },
];

export default function Login({ onDone }: { onDone: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await signIn(login, password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="auth">
      <section className="auth-hero">
        {SLIDES.map((s, i) => (
          <div key={s.src} className={`slide ${i === slide ? 'on' : ''}`} style={{ backgroundImage: `url(${s.src})` }} />
        ))}
        <div className="auth-hero-shade" />

        <div className="auth-logo">
          <span className="mark">V</span>
          <span>Cantine de Vatel</span>
        </div>

        <div className="auth-hero-copy">
          <h2>
            Toute la cantine,
            <br />
            sous contrôle.
          </h2>
          <p>Ventes, dépenses, stocks et comptes : suivez le restaurant scolaire en un seul endroit, en direct.</p>
          <div className="dish-caption" key={slide}>
            <strong>{SLIDES[slide].name}</strong>
            <span>{SLIDES[slide].line}</span>
          </div>
          <div className="dots">
            {SLIDES.map((s, i) => (
              <button key={s.src} type="button" aria-label={s.name} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-badge">Administration générale</div>
          <h1>Bon retour 👋</h1>
          <p className="auth-sub">Connecte-toi pour piloter la cantine.</p>

          <label className="auth-field">
            <span>Identifiant</span>
            <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus placeholder="admin" />
          </label>
          <label className="auth-field">
            <span>Mot de passe</span>
            <div className="pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}>
                {show ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" disabled={busy || !login.trim() || !password}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="auth-foot">Accès réservé à l’équipe d’administration.</p>
        </form>
      </section>
    </div>
  );
}
