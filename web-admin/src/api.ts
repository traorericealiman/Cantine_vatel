import { emailOf, supabase } from './supabase';

export type Role = 'student' | 'parent' | 'admin';

export interface PeriodStat {
  revenue: number;
  previous: number;
  standard: number;
  promo: number;
  standardRevenue: number;
  promoRevenue: number;
  sold: number;
  satisfaction: number;
  topDish: string | null;
  cancelled: number;
}
export interface ChartPoint {
  d: string;
  revenue: number;
  sold: number;
}
export interface Dash {
  day: PeriodStat;
  week: PeriodStat;
  month: PeriodStat;
  chartDay: ChartPoint[];
  chartWeek: ChartPoint[];
  chartMonth: ChartPoint[];
  creditTotal: number;
  creditStudents: number;
  pickupsToday: number;
  pickupsDone: number;
  students: number;
  parents: number;
  subscriptions: number;
  refunds: number;
  creditMeals: number;
  creditFees: number;
  lowAlerts: number;
  lossValue: number;
  lossPct: number;
}

export interface Ingredient {
  id: string;
  fr: string;
  unit: string;
  stock: number;
  threshold: number;
  price: number;
}
export interface Purchase {
  amount: number;
  at: string;
}

export interface User {
  id: string;
  role: Role;
  login: string;
  full_name: string;
  first_name: string;
  class_name: string | null;
  must_change_password: boolean;
  created_at: string;
}
export interface UsersData {
  users: User[];
  wallets: { student_id: string; balance: number; debt: number }[];
  links: { parent_id: string; student_id: string }[];
}

/** Connexion : seul le rôle « admin » peut entrer dans cette application. */
export async function signIn(login: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailOf(login), password });
  if (error || !data.user) throw new Error('Identifiant ou mot de passe incorrect.');
  const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (p?.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Ce compte n’a pas accès à l’administration.');
  }
}

/** Jour de référence : aujourd'hui si c'est un jour de classe, sinon le prochain lundi. */
export function serviceDay(): string {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return toKey(d);
}
export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function loadDash(): Promise<Dash> {
  const { data, error } = await supabase.rpc('admin_dashboard', { p_day: serviceDay() });
  if (error) throw error;
  return data as Dash;
}

/** Ingrédients et achats (lecture seule : cette application ne saisit ni stock ni achats). */
export async function loadStockData(): Promise<{ ingredients: Ingredient[]; purchases: Purchase[]; dishes: Record<string, string> }> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const [i, p, d] = await Promise.all([
    supabase.from('ingredients').select('id,fr,unit,stock,threshold,price').order('fr'),
    supabase.from('purchases').select('amount,at').gte('at', since.toISOString()),
    supabase.from('dishes').select('id,fr'),
  ]);
  return {
    ingredients: (i.data ?? []).map((r) => ({ ...r, stock: Number(r.stock), threshold: Number(r.threshold), price: Number(r.price) })),
    purchases: (p.data ?? []).map((r) => ({ amount: Number(r.amount), at: r.at as string })),
    dishes: Object.fromEntries((d.data ?? []).map((r) => [r.id as string, r.fr as string])),
  };
}

/** Appel de la fonction serveur de gestion des comptes (création, mot de passe, liens). */
export async function users<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    let msg = error.message;
    try {
      const j = await (error as unknown as { context: Response }).context.json();
      if (j?.error) msg = j.error;
    } catch {
      /* garde le message d'origine */
    }
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

/** Mot de passe par défaut : 8 caractères lisibles + un chiffre. */
export function genPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '7';
}

export const ERRORS: Record<string, string> = {
  login_taken: 'Cet identifiant existe déjà.',
  bad_login: 'Identifiant invalide : 3 à 40 caractères (lettres, chiffres, point, tiret).',
  bad_name: 'Le nom est trop court.',
  bad_role: 'Rôle invalide.',
  forbidden: 'Accès refusé.',
  bad_link: 'Ce lien n’est pas possible (un parent avec un élève).',
  bad_target: 'Ce compte ne peut pas être modifié ici.',
};
