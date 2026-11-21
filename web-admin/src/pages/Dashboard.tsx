import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPoint, Dash, Ingredient, Purchase, loadDash, loadStockData, serviceDay, toKey } from '../api';

type Period = 'day' | 'week' | 'month';
const PERIODS: { key: Period; label: string; unit: string }[] = [
  { key: 'day', label: 'Jour', unit: 'aujourd’hui' },
  { key: 'week', label: 'Semaine', unit: 'cette semaine' },
  { key: 'month', label: 'Mois', unit: 'ce mois' },
];

const money = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;
const parse = (k: string) => new Date(`${k}T00:00:00`);
const addDays = (k: string, n: number) => {
  const d = parse(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
const monthEnd = (k: string) => {
  const d = parse(k);
  d.setMonth(d.getMonth() + 1, 0);
  return toKey(d);
};
const mondayOf = (k: string) => addDays(k, -((parse(k).getDay() + 6) % 7));
const spent = (purchases: Purchase[], from: string, to: string) =>
  purchases.filter((p) => p.at.slice(0, 10) >= from && p.at.slice(0, 10) <= to).reduce((s, p) => s + p.amount, 0);

function Kpi({ label, value, detail, hero, tone }: { label: string; value: string; detail?: React.ReactNode; hero?: boolean; tone?: 'green' | 'red' | 'warm' }) {
  return (
    <div className={`card kpi ${hero ? 'hero' : ''}`}>
      <div className="label">{label}</div>
      <div className="value" style={tone && !hero ? { color: tone === 'green' ? 'var(--green)' : tone === 'red' ? 'var(--red)' : 'var(--warm)' } : undefined}>
        {value}
      </div>
      {detail ? <div className="detail">{detail}</div> : null}
    </div>
  );
}

/** Tableau de bord de l'administrateur général : ventes, dépenses, résultat et indicateurs de stock (lecture seule). */
export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [dash, setDash] = useState<Dash | null>(null);
  const [stock, setStock] = useState<{ ingredients: Ingredient[]; purchases: Purchase[]; dishes: Record<string, string> } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [d, s] = await Promise.all([loadDash(), loadStockData()]);
        setDash(d);
        setStock(s);
        setError('');
      } catch (e) {
        setError((e as Error).message || 'Chargement impossible.');
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const day = serviceDay();
  const range = useMemo(() => {
    if (period === 'day') return [day, day] as const;
    if (period === 'week') return [mondayOf(day), addDays(mondayOf(day), 6)] as const;
    return [`${day.slice(0, 8)}01`, monthEnd(`${day.slice(0, 8)}01`)] as const;
  }, [period, day]);

  if (error && !dash) return <div className="card error">{error}</div>;
  if (!dash || !stock) return <div className="muted">Chargement…</div>;

  const k = dash[period];
  const expenses = spent(stock.purchases, range[0], range[1]);
  const delta = k.previous > 0 ? (k.revenue - k.previous) / k.previous : 0;
  const unit = PERIODS.find((p) => p.key === period)!.unit;

  const points: ChartPoint[] = period === 'day' ? dash.chartDay : period === 'week' ? dash.chartWeek : dash.chartMonth;
  const chart = points.map((p, i) => {
    const from = p.d;
    const to = period === 'day' ? p.d : period === 'week' ? addDays(p.d, 6) : monthEnd(p.d);
    const label =
      period === 'day'
        ? parse(p.d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
        : period === 'week'
          ? i === points.length - 1
            ? 'Cette semaine'
            : `S-${points.length - 1 - i}`
          : parse(p.d).toLocaleDateString('fr-FR', { month: 'short' });
    return { label, Recettes: p.revenue, Dépenses: spent(stock.purchases, from, to), Plats: p.sold };
  });

  const low = stock.ingredients.filter((i) => i.stock < i.threshold);
  const stockValue = stock.ingredients.reduce((s, i) => s + i.stock * i.price, 0);
  const topName = k.topDish ? (stock.dishes[k.topDish] ?? k.topDish) : '—';
  const weekSpent = spent(stock.purchases, mondayOf(day), addDays(mondayOf(day), 6));
  const result = k.revenue - expenses;

  return (
    <>
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div className="seg">
          {PERIODS.map((p) => (
            <button key={p.key} className={period === p.key ? 'on' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="muted">Données en direct · mises à jour chaque minute</span>
      </div>

      <div className="grid k4">
        <Kpi
          hero
          label={`Recettes · ${unit}`}
          value={money(k.revenue)}
          detail={
            <>
              <span className={delta >= 0 ? 'up' : 'down'}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)} %
              </span>{' '}
              vs période précédente
            </>
          }
        />
        <Kpi label={`Dépenses (achats) · ${unit}`} value={money(expenses)} detail="Total des achats enregistrés" />
        <Kpi label="Résultat" value={money(result)} tone={result >= 0 ? 'green' : 'red'} detail="Recettes − dépenses" />
        <Kpi label={`Plats vendus · ${unit}`} value={k.sold.toLocaleString('fr-FR')} detail={`${k.standard} au tarif normal · ${k.promo} au tarif promo`} />
      </div>

      <div className="grid k4" style={{ marginTop: 14 }}>
        <Kpi label="Satisfaction" value={k.sold > 0 && k.satisfaction > 0 ? `${k.satisfaction} %` : '—'} tone="green" detail="Part de 👍 parmi les avis" />
        <Kpi label="Plat le plus commandé" value={topName} detail={unit} />
        <Kpi label="Commandes annulées" value={String(k.cancelled)} detail={unit} />
        <Kpi label="Retraits du jour" value={`${dash.pickupsDone} / ${dash.pickupsToday}`} detail="Scans validés sur les commandes du jour" />
      </div>

      <h2>Évolution</h2>
      <div className="grid k2">
        <div className="card">
          <strong>Recettes et dépenses</strong>
          <div style={{ height: 280, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Bar dataKey="Recettes" fill="#0f172a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <strong>Plats vendus</strong>
          <div style={{ height: 280, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Plats" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h2>Stock (indicateurs)</h2>
      <div className="grid k4">
        <Kpi label="Valeur du stock" value={money(stockValue)} detail={`${stock.ingredients.length} ingrédients`} />
        <Kpi label="Sous le seuil d’alerte" value={String(low.length)} tone={low.length ? 'red' : 'green'} detail={low.length ? 'À réapprovisionner' : 'Tout est en ordre'} />
        <Kpi label="Écart de stock (semaine)" value={`${dash.lossPct} %`} tone={dash.lossPct > 5 ? 'warm' : undefined} detail={`${money(dash.lossValue)} de pertes estimées`} />
        <Kpi label="Achats de la semaine" value={money(weekSpent)} detail="Dépenses d’approvisionnement" />
      </div>
      {low.length ? (
        <div className="card" style={{ marginTop: 14 }}>
          <strong>Ingrédients sous le seuil</strong>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Ingrédient</th>
                <th>En stock</th>
                <th>Seuil</th>
              </tr>
            </thead>
            <tbody>
              {low.map((i) => (
                <tr key={i.id}>
                  <td>{i.fr}</td>
                  <td>
                    <span className="badge red">
                      {i.stock} {i.unit}
                    </span>
                  </td>
                  <td className="muted">
                    {i.threshold} {i.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2>Communauté et crédits</h2>
      <div className="grid k4">
        <Kpi label="Élèves" value={String(dash.students)} />
        <Kpi label="Parents" value={String(dash.parents)} />
        <Kpi label="Abonnés à l’offre annuelle" value={String(dash.subscriptions)} />
        <Kpi label="Crédits en cours" value={money(dash.creditTotal)} tone={dash.creditTotal ? 'warm' : undefined} detail={`${dash.creditStudents} élève(s) · frais encaissés cette semaine : ${money(dash.creditFees)}`} />
      </div>
    </>
  );
}
