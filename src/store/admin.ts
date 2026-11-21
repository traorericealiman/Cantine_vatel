import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { Allergen, CREDIT_FEE_RATE, Cat, DISHES, Dish, MAX_CREDIT_DISHES, OFFERS, Offer, OfferId, SETTINGS, addDays, dateKey, defaultMenu, serviceDays, setCreditRule } from '../lib/data';
import { loadGlobal, useApp } from './app';

/**
 * Espace administrateur : tout est lu et écrit dans la base Supabase (plats, menus, service, stocks, achats,
 * consommation, inventaire, chiffres du tableau de bord). Les écrans ne gardent que l'état affiché.
 */

export type ServiceMode = 'tables' | 'call';
export type Period = 'day' | 'week' | 'month';

export interface Ingredient {
  id: string;
  fr: string;
  en: string;
  unit: string;
  stock: number;
  threshold: number;
  price: number; // F par unité, prix moyen
}

export interface Issue {
  id: string;
  student: string;
  dishId: string;
  status: 'open' | 'refunded' | 'resolved';
}

/** Un achat du journal de la semaine : quoi, combien, pour combien, chez qui, pour quels plats. */
export interface Purchase {
  id: string;
  ingredientId?: string;
  name: string;
  qty: number;
  unit: string;
  amount: number;
  supplier: string;
  usedFor: string[]; // identifiants de plats
  note: string;
  at: number;
}

/** Une consommation : ce qui a été utilisé en cuisine pendant la semaine (le stock baisse). */
export interface Usage {
  id: string;
  ingredientId?: string;
  name: string;
  qty: number;
  unit: string;
  usedFor: string[];
  note: string;
  at: number;
}

export interface Comment {
  dishId: string;
  author: string;
  vote: 1 | -1;
  text: string;
}

/** Chiffres d'une période (jour, semaine, mois) calculés par la base. */
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
  forecastDishes: number;
  forecastWeekRevenue: number;
  budgetNext: number;
  needs: { id: string; need: number; stock: number; toBuy: number; cost: number }[];
  lossValue: number;
  lossPct: number;
}

const EMPTY_PERIOD: PeriodStat = { revenue: 0, previous: 0, standard: 0, promo: 0, standardRevenue: 0, promoRevenue: 0, sold: 0, satisfaction: 0, topDish: null, cancelled: 0 };
export const EMPTY_DASH: Dash = {
  day: EMPTY_PERIOD,
  week: EMPTY_PERIOD,
  month: EMPTY_PERIOD,
  chartDay: [],
  chartWeek: [],
  chartMonth: [],
  creditTotal: 0,
  creditStudents: 0,
  pickupsToday: 0,
  pickupsDone: 0,
  students: 0,
  parents: 0,
  subscriptions: 0,
  refunds: 0,
  creditMeals: 0,
  creditFees: 0,
  lowAlerts: 0,
  forecastDishes: 0,
  forecastWeekRevenue: 0,
  budgetNext: 0,
  needs: [],
  lossValue: 0,
  lossPct: 0,
};

/** Jour de service affiché côté admin : aujourd'hui si c'est un jour d'école, sinon le prochain. */
export const serviceDay = () => serviceDays()[0].key;

/** Lundi de la semaine en cours (début de l'inventaire hebdomadaire). */
export const weekStart = () => {
  const d = new Date();
  return dateKey(addDays(d, -((d.getDay() + 6) % 7)));
};

/** Commandes du jour comptées dans la base : total, déjà retirés, ingrédients retirés par les élèves. */
export interface DayStat {
  total: number;
  received: number;
  removed: Record<string, number>;
  /** Variantes de préparation : clé = ingrédients retirés triés (vide = standard). */
  variants: Record<string, { removed: string[]; n: number }>;
  /** Élèves ayant déclaré une allergie : à préparer dans un lot séparé. */
  allergy: { name: string; list: string[] }[];
}

/** Repères de couleur pour les bols ou tickets de la cuisine : une couleur par variante. */
export const VARIANT_COLORS = ['#16A34A', '#EA580C', '#7C3AED', '#DB2777', '#CA8A04', '#0D9488', '#2563EB', '#92400E'];
export const ALLERGY_COLOR = '#DC2626'

/** Lignes du service : les plats commandés ce jour-là, avec les ingrédients à retirer. */
export function dayRows(day: string, stats: Record<string, DayStat>) {
  return Object.entries(stats)
    .filter(([, st]) => st.total > 0)
    .map(([id, st]) => {
      const dish = DISHES.find((d) => d.id === id);
      if (!dish) return null;
      const without = Object.entries(st.removed)
        .map(([cid, n]) => ({ comp: dish.components.find((c) => c.id === cid), n }))
        .filter((x): x is { comp: NonNullable<typeof x.comp>; n: number } => !!x.comp && x.n > 0);
      // Variantes : « standard » d'abord, puis par nombre de portions ; une couleur chacune.
      const variants = Object.entries(st.variants)
        .sort(([ka, a], [kb, b]) => (ka === '' ? -1 : kb === '' ? 1 : b.n - a.n))
        .map(([key, v], i) => ({
          key,
          n: v.n,
          color: VARIANT_COLORS[i % VARIANT_COLORS.length],
          removed: v.removed.map((id) => dish.components.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c),
        }));
      return { dish, total: st.total, without, variants, allergy: st.allergy };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
}

export const TABLE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const num = (v: unknown) => Number(v ?? 0);

interface AdminState {
  /** Jour affiché dans l'écran Service (le jour le plus proche par défaut, modifiable). */
  day: string;
  setDay: (day: string) => void;
  mode: ServiceMode;
  called: string[];
  served: Record<string, number>;
  tables: Record<string, string>;
  qrToken: string;
  qrGeneratedAt: number;
  dayStats: Record<string, DayStat>;
  issues: Issue[];
  catalog: Dish[];
  menu: Record<string, Record<string, string>>;
  published: Record<string, boolean>;
  ingredients: Ingredient[];
  purchases: Purchase[];
  usages: Usage[];
  inventoryDone: boolean;
  reportExported: boolean;
  cutoff: number;
  offers: Offer[];
  /** Nombre de plats fixé pour chaque ligne du menu (`jour|ligne`) ; absent = illimité. */
  capacity: Record<string, number | null>;
  /** Plats déjà commandés (`jour|plat`). */
  taken: Record<string, number>;
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  creditMax: number;
  creditRate: number;
  setCredit: (max: number, rate: number) => void;
  stats: Dash;
  /** Vrai dès que les chiffres ont été reçus de la base : avant, on affiche « — » plutôt qu'un faux zéro. */
  statsReady: boolean;
  comments: Comment[];

  loadService: () => Promise<void>;
  loadQr: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  loadMenus: () => Promise<void>;
  loadStock: () => Promise<void>;
  loadDashboard: () => Promise<void>;
  setMode: (m: ServiceMode) => void;
  callDish: (dishId: string, table?: string) => void;
  cancelCall: (dishId: string) => void;
  regenerateQr: () => void;
  setIssue: (id: string, status: Issue['status']) => void;
  addDish: (d: Omit<Dish, 'id' | 'likes' | 'votes' | 'table'>) => Promise<{ error?: string }>;
  updateDish: (id: string, d: Omit<Dish, 'id' | 'likes' | 'votes' | 'table'>) => Promise<{ error?: string }>;
  archiveDish: (id: string) => Promise<void>;
  addMenuSlot: (day: string, cat: Cat, dishId: string) => void;
  removeMenuSlot: (day: string, slot: string) => void;
  saveIngredient: (i: { id?: string; fr: string; en: string; unit: string; price: number; threshold: number; stock: number; recipe: { dishId: string; qty: number }[] }) => Promise<void>;
  loadRecipe: (ingredientId: string) => Promise<Record<string, number>>;
  deleteIngredient: (id: string) => Promise<void>;
  setMenuDish: (day: string, slot: string, dishId: string) => void;
  publish: (day: string) => void;
  addPurchase: (p: Omit<Purchase, 'id' | 'at'>) => void;
  removePurchase: (id: string) => void;
  addUsage: (u: Omit<Usage, 'id' | 'at'>) => void;
  removeUsage: (id: string) => void;
  validateWeek: () => void;
  exportReport: () => void;
  setCutoff: (minutes: number) => void;
  setOffer: (id: OfferId, patch: { fee?: number; pct?: number }) => void;
  setCapacity: (day: string, slot: string, n: number | null) => void;
}

export const useAdmin = create<AdminState>((set, get) => ({
  day: serviceDay(),
  setDay: (day) => {
    set({ day, dayStats: {}, called: [], tables: {}, served: {} });
    get().loadService();
  },
  mode: 'call',
  called: [],
  served: {},
  dayStats: {},
  tables: {},
  qrToken: '',
  qrGeneratedAt: Date.now(),
  issues: [],
  catalog: [...DISHES],
  menu: {},
  published: {},
  ingredients: [],
  purchases: [],
  usages: [],
  inventoryDone: false,
  reportExported: false,
  cutoff: SETTINGS.cutoff,
  offers: [...OFFERS],
  capacity: {},
  taken: {},
  demoMode: SETTINGS.demo,
  setDemoMode: (on) => {
    SETTINGS.demo = on;
    set({ demoMode: on });
    supabase.from('settings').update({ demo_mode: on }).eq('id', 1).then(() => {});
  },
  creditMax: MAX_CREDIT_DISHES,
  creditRate: CREDIT_FEE_RATE,
  stats: EMPTY_DASH,
  statsReady: false,
  comments: [],

  // Tout recharger : plats, menus, service, stocks, chiffres.
  loadAll: async () => {
    // Les chiffres partent tout de suite, sans attendre le catalogue.
    await Promise.all([get().loadDashboard(), get().loadService(), get().loadStock(), get().loadCatalog().then(() => get().loadMenus())]);
    set({ cutoff: SETTINGS.cutoff, offers: [...OFFERS], creditMax: MAX_CREDIT_DISHES, creditRate: CREDIT_FEE_RATE, demoMode: SETTINGS.demo });
  },

  // Catalogue : la liste des plats (et leurs avis) relue depuis la base.
  loadCatalog: async () => {
    await loadGlobal();
    set({ catalog: [...DISHES] });
  },

  // Menus planifiés des prochains jours de service (publiés ou non). Un jour sans menu reçoit la rotation par défaut.
  loadMenus: async () => {
    const days = serviceDays().map((d) => d.key);
    let { data } = await supabase.from('menu_items').select('day,slot,dish_id,published,capacity').in('day', days);
    const have = new Set((data ?? []).map((r: any) => r.day));
    const missing = days.filter((d) => !have.has(d)).flatMap((day) => defaultMenu(day).map((m) => ({ day, slot: m.slot, dish_id: m.dishId, published: false })));
    if (missing.length) {
      await supabase.from('menu_items').upsert(missing, { onConflict: 'day,slot', ignoreDuplicates: true });
      data = (await supabase.from('menu_items').select('day,slot,dish_id,published,capacity').in('day', days)).data;
    }
    const menu: Record<string, Record<string, string>> = {};
    const published: Record<string, boolean> = {};
    const capacity: Record<string, number | null> = {};
    (data ?? []).forEach((r: any) => {
      (menu[r.day] ??= {})[r.slot] = r.dish_id;
      capacity[`${r.day}|${r.slot}`] = r.capacity;
      published[r.day] = (published[r.day] ?? true) && r.published;
    });
    const ords = await supabase.from('orders').select('day,dish_id').in('day', days).neq('status', 'cancelled');
    const taken: Record<string, number> = {};
    (ords.data ?? []).forEach((r: any) => (taken[`${r.day}|${r.dish_id}`] = (taken[`${r.day}|${r.dish_id}`] ?? 0) + 1));
    set({ menu, published, capacity, taken });
  },

  // Service du jour : tout est enregistré dans la base, les élèves le voient en direct.
  loadService: async () => {
    const day = get().day;
    const [st, calls, ords, iss] = await Promise.all([
      supabase.from('settings').select('service_mode').eq('id', 1).maybeSingle(),
      supabase.from('service_calls').select('dish_id,table_letter,called_at').eq('day', day),
      supabase
        .from('orders')
        .select('dish_id,removed,status,student:profiles!student_id(first_name,full_name,allergies,custom_allergies)')
        .eq('day', day)
        .neq('status', 'cancelled'),
      supabase.from('issues').select('id,status,dish_id,student:profiles!student_id(first_name,full_name)').order('created_at', { ascending: false }).limit(30),
    ]);
    const stats: Record<string, DayStat> = {};
    (ords.data ?? []).forEach((o: any) => {
      const s = (stats[o.dish_id] ??= { total: 0, received: 0, removed: {}, variants: {}, allergy: [] });
      s.total += 1;
      if (o.status === 'received') s.received += 1;
      const removed: string[] = [...(o.removed ?? [])].sort();
      removed.forEach((r) => (s.removed[r] = (s.removed[r] ?? 0) + 1));
      const key = removed.join('+');
      (s.variants[key] ??= { removed, n: 0 }).n += 1;
      // Allergie déclarée (cases ou saisie libre) : lot séparé, avec le détail pour éviter les contaminations.
      const list = [...(o.student?.allergies ?? []), ...(o.student?.custom_allergies ?? [])];
      if (list.length) {
        const last = String(o.student?.full_name ?? '').split(' ')[1];
        s.allergy.push({ name: `${o.student?.first_name ?? ''}${last ? ` ${last[0]}.` : ''}`, list });
      }
    });
    const tables: Record<string, string> = {};
    const called: string[] = [];
    (calls.data ?? []).forEach((r: any) => {
      if (r.table_letter) tables[r.dish_id] = r.table_letter;
      if (r.called_at) called.push(r.dish_id);
    });
    set({
      mode: st.data?.service_mode ?? 'call',
      called,
      tables,
      dayStats: stats,
      served: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.received])),
      issues: (iss.data ?? []).map((r: any) => ({ id: r.id, student: r.student?.first_name ?? r.student?.full_name ?? '', dishId: r.dish_id, status: r.status })),
    });
  },

  // Stocks, achats et consommation de la semaine en cours, inventaire validé ou non.
  loadStock: async () => {
    const wk = weekStart();
    const [ing, pur, use, inv] = await Promise.all([
      supabase.from('ingredients').select('*').order('fr'),
      supabase.from('purchases').select('*').gte('at', wk).order('at', { ascending: false }),
      supabase.from('usages').select('*').gte('at', wk).order('at', { ascending: false }),
      supabase.from('inventory_weeks').select('week_start').eq('week_start', wk).maybeSingle(),
    ]);
    set({
      ingredients: (ing.data ?? []).map((r: any) => ({ id: r.id, fr: r.fr, en: r.en, unit: r.unit, stock: num(r.stock), threshold: num(r.threshold), price: num(r.price) })),
      purchases: (pur.data ?? []).map((r: any) => ({
        id: r.id,
        ingredientId: r.ingredient_id ?? undefined,
        name: r.name,
        qty: num(r.qty),
        unit: r.unit,
        amount: num(r.amount),
        supplier: r.supplier,
        usedFor: r.used_for ?? [],
        note: r.note,
        at: Date.parse(r.at),
      })),
      usages: (use.data ?? []).map((r: any) => ({
        id: r.id,
        ingredientId: r.ingredient_id ?? undefined,
        name: r.name,
        qty: num(r.qty),
        unit: r.unit,
        usedFor: r.used_for ?? [],
        note: r.note,
        at: Date.parse(r.at),
      })),
      inventoryDone: !!inv.data,
    });
  },

  // Chiffres du tableau de bord (recettes, ventes, prévisions…) et commentaires, calculés par la base.
  loadDashboard: async () => {
    const [d, c] = await Promise.all([supabase.rpc('admin_dashboard', { p_day: serviceDay() }), supabase.rpc('admin_comments')]);
    if (d.data) set({ stats: { ...EMPTY_DASH, ...(d.data as Dash) }, statsReady: true });
    set({
      comments: ((c.data as any[]) ?? []).map((r) => ({ dishId: r.dish_id, author: r.author, vote: r.vote, text: r.comment })),
    });
  },

  loadQr: async () => {
    const { data } = await supabase.rpc('admin_qr');
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.token) set({ qrToken: row.token, qrGeneratedAt: Date.parse(row.generated_at) });
  },

  setMode: (mode) => {
    set({ mode });
    supabase.from('settings').update({ service_mode: mode }).eq('id', 1).then(() => {});
  },
  // Appeler un plat : en mode « tables », la table choisie est enregistrée avec l'appel (validation en un seul geste).
  callDish: (dishId, table) => {
    set((s) => ({ called: s.called.includes(dishId) ? s.called : [...s.called, dishId], tables: table ? { ...s.tables, [dishId]: table } : s.tables }));
    const row: Record<string, unknown> = { day: get().day, dish_id: dishId, called_at: new Date().toISOString() };
    if (table) row.table_letter = table;
    supabase.from('service_calls').upsert(row, { onConflict: 'day,dish_id' }).then(() => {});
  },
  // Annuler l'appel : le plat redevient « non disponible » chez les élèves.
  cancelCall: (dishId) => {
    set((s) => ({ called: s.called.filter((d) => d !== dishId) }));
    supabase.from('service_calls').update({ called_at: null }).eq('day', get().day).eq('dish_id', dishId).then(() => {});
  },
  regenerateQr: () => {
    supabase.rpc('regenerate_qr').then(({ data }) => {
      if (typeof data === 'string') set({ qrToken: data, qrGeneratedAt: Date.now() });
    });
  },
  setIssue: (id, status) => {
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status } : i)) }));
    const q = status === 'refunded' ? supabase.rpc('refund_issue', { p_issue: id }) : supabase.from('issues').update({ status }).eq('id', id);
    q.then(() => get().loadService());
  },

  // Nouveau plat : enregistré dans la base, donc visible tout de suite dans le catalogue et chez les élèves.
  addDish: async (d) => {
    const id = `${slug(d.fr) || 'plat'}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from('dishes').insert({
      id,
      fr: d.fr,
      en: d.en,
      cat: d.cat,
      price: d.price,
      emoji: d.emoji,
      custom: !!d.custom,
      components: d.components,
      allergens: d.allergens,
      image: d.image ?? null,
    });
    if (error) return { error: error.message };
    // Visible tout de suite dans le catalogue ; le rechargement complet se fait en arrière-plan.
    DISHES.push({ ...d, id, likes: 0, votes: 0, table: 'A' });
    set({ catalog: [...DISHES] });
    get().loadCatalog();
    return {};
  },

  // Modifier un plat du catalogue.
  updateDish: async (id, d) => {
    const { error } = await supabase
      .from('dishes')
      .update({ fr: d.fr, en: d.en, cat: d.cat, price: d.price, emoji: d.emoji, custom: !!d.custom, components: d.components, allergens: d.allergens, image: d.image ?? null })
      .eq('id', id);
    if (error) return { error: error.message };
    const i = DISHES.findIndex((x) => x.id === id);
    if (i >= 0) DISHES[i] = { ...DISHES[i], ...d };
    set({ catalog: [...DISHES] });
    get().loadCatalog();
    return {};
  },

  // Retirer un plat du catalogue : il disparaît des menus à venir ; les commandes déjà passées restent.
  archiveDish: async (id) => {
    await supabase.from('menu_items').delete().eq('dish_id', id).gte('day', dateKey(new Date()));
    const { error } = await supabase.from('dishes').update({ active: false }).eq('id', id);
    if (!error) {
      await get().loadCatalog();
      await get().loadMenus();
    }
  },

  // Ajouter une ligne dans le menu d'un jour (brouillon jusqu'à la publication) ou en retirer une.
  addMenuSlot: (day, cat, dishId) => {
    const used = Object.keys(get().menu[day] ?? {}).filter((k) => k.startsWith(cat));
    let n = 0;
    while (used.includes(`${cat}${n}`)) n += 1;
    const slot = `${cat}${n}`;
    set((s) => ({ menu: { ...s.menu, [day]: { ...s.menu[day], [slot]: dishId } }, published: { ...s.published, [day]: false } }));
    supabase.from('menu_items').insert({ day, slot, dish_id: dishId, published: false }).then(() => {});
  },
  removeMenuSlot: (day, slot) => {
    set((s) => {
      const rows = { ...s.menu[day] };
      delete rows[slot];
      return { menu: { ...s.menu, [day]: rows } };
    });
    supabase.from('menu_items').delete().eq('day', day).eq('slot', slot).then(() => {});
  },

  // Ingrédient (création ou modification) avec sa recette : quantité utilisée par portion de chaque plat.
  saveIngredient: async (i) => {
    const id = i.id ?? `${slug(i.fr) || 'ingredient'}-${Math.random().toString(36).slice(2, 5)}`;
    const row = { fr: i.fr, en: i.en, unit: i.unit, price: i.price, threshold: i.threshold };
    const res = i.id
      ? await supabase.from('ingredients').update(row).eq('id', id)
      : await supabase.from('ingredients').insert({ id, ...row, stock: i.stock });
    if (res.error) return;
    await supabase.from('recipes').delete().eq('ingredient_id', id);
    if (i.recipe.length) await supabase.from('recipes').insert(i.recipe.map((r) => ({ dish_id: r.dishId, ingredient_id: id, qty_per_portion: r.qty })));
    await get().loadStock();
  },
  deleteIngredient: async (id) => {
    const { error } = await supabase.rpc('delete_ingredient', { p_id: id });
    if (!error) await get().loadStock();
  },
  loadRecipe: async (ingredientId) => {
    const { data } = await supabase.from('recipes').select('dish_id,qty_per_portion').eq('ingredient_id', ingredientId);
    return Object.fromEntries((data ?? []).map((r: any) => [r.dish_id, Number(r.qty_per_portion)]));
  },

  // Remplacer un plat : le jour repasse en brouillon (non publié) jusqu'à la publication.
  setMenuDish: (day, slot, dishId) => {
    set((s) => ({ menu: { ...s.menu, [day]: { ...s.menu[day], [slot]: dishId } }, published: { ...s.published, [day]: false }, capacity: { ...s.capacity, [`${day}|${slot}`]: null } }));
    supabase.from('menu_items').upsert({ day, slot, dish_id: dishId, published: false, capacity: null }, { onConflict: 'day,slot' }).then(() => {});
  },
  // Nombre de plats que la cuisine peut préparer : les premiers arrivés sont servis, les autres doivent choisir un autre plat.
  setCapacity: (day, slot, n) => {
    const v = n === null ? null : Math.max(0, Math.round(n));
    set((s) => ({ capacity: { ...s.capacity, [`${day}|${slot}`]: v } }));
    supabase.from('menu_items').update({ capacity: v }).eq('day', day).eq('slot', slot).then(() => get().loadMenus());
  },
  publish: (day) => {
    set((s) => ({ published: { ...s.published, [day]: true } }));
    supabase.from('menu_items').update({ published: true }).eq('day', day).then(() => {});
  },

  // Achats et consommation : le stock des ingrédients est mis à jour par la base (déclencheurs).
  addPurchase: (p) => {
    supabase
      .from('purchases')
      .insert({ ingredient_id: p.ingredientId ?? null, name: p.name, qty: p.qty, unit: p.unit, amount: p.amount, supplier: p.supplier, used_for: p.usedFor, note: p.note })
      .then(() => get().loadStock());
  },
  removePurchase: (id) => {
    set((s) => ({ purchases: s.purchases.filter((x) => x.id !== id) }));
    supabase.from('purchases').delete().eq('id', id).then(() => get().loadStock());
  },
  addUsage: (u) => {
    supabase
      .from('usages')
      .insert({ ingredient_id: u.ingredientId ?? null, name: u.name, qty: u.qty, unit: u.unit, used_for: u.usedFor, note: u.note })
      .then(() => get().loadStock());
  },
  removeUsage: (id) => {
    set((s) => ({ usages: s.usages.filter((x) => x.id !== id) }));
    supabase.from('usages').delete().eq('id', id).then(() => get().loadStock());
  },
  validateWeek: () => {
    set({ inventoryDone: true });
    supabase.from('inventory_weeks').upsert({ week_start: weekStart(), validated_by: useApp.getState().uid }, { onConflict: 'week_start' }).then(() => {});
  },
  exportReport: () => set({ reportExported: true }),

  // Les réglages sont aussi écrits dans les objets partagés de data.ts, lus par les espaces élève et parent.
  setCutoff: (minutes) => {
    const m = Math.max(7 * 60, Math.min(14 * 60, minutes));
    SETTINGS.cutoff = m;
    set({ cutoff: m });
    supabase.from('settings').update({ cutoff_minutes: m }).eq('id', 1).then(() => {});
  },
  // Règle du crédit d'urgence : nombre maximum de plats et frais à partir du 2e (écrits dans la base, lus par le serveur).
  setCredit: (max, rate) => {
    const m = Math.max(0, Math.min(10, Math.round(max)));
    const r = Math.max(0, Math.min(1, rate));
    setCreditRule(m, r);
    set({ creditMax: m, creditRate: r });
    supabase.from('settings').update({ max_credit: m, credit_fee_rate: r }).eq('id', 1).then(() => {});
  },
  // Offres promotionnelles : prix de l'abonnement et pourcentage de réduction (lus par les élèves et les parents).
  setOffer: (id, patch) => {
    const o = OFFERS.find((x) => x.id === id);
    if (!o) return;
    if (patch.fee !== undefined) o.fee = Math.max(0, Math.round(patch.fee));
    if (patch.pct !== undefined) o.pct = Math.max(1, Math.min(90, Math.round(patch.pct)));
    set({ offers: OFFERS.map((x) => ({ ...x })) });
    supabase.from('offers').update({ fee: o.fee, pct: o.pct }).eq('id', id).then(() => {});
  },
}));

/**
 * Mise à jour en direct de l'espace admin : une nouvelle commande, un retrait, un appel ou un signalement
 * recharge l'écran en moins d'une seconde, sans attendre le rafraîchissement régulier.
 */
let adminChannel: ReturnType<typeof supabase.channel> | null = null;
export function startAdminLive() {
  stopAdminLive();
  let t1: ReturnType<typeof setTimeout> | undefined;
  let t2: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    clearTimeout(t1);
    t1 = setTimeout(() => useAdmin.getState().loadService(), 300);
    clearTimeout(t2);
    t2 = setTimeout(() => useAdmin.getState().loadDashboard(), 2500);
  };
  adminChannel = supabase
    .channel('admin-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, soon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, soon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, soon)
    .subscribe();
}
export function stopAdminLive() {
  if (adminChannel) supabase.removeChannel(adminChannel);
  adminChannel = null;
}

/** Plat du catalogue admin (y compris les plats ajoutés). */
export function catalogDish(catalog: Dish[], id: string): Dish {
  return catalog.find((d) => d.id === id) ?? DISHES[0];
}

/** Emplacement d'un plat dans le menu du jour : catégorie + rang (ex. « main1 »). */
export const slotKey = (cat: Cat, index: number) => `${cat}${index}`;

/** Menu d'un jour planifié, emplacement par emplacement (catégorie puis rang). */
export function adminMenu(_day: string, rows: Record<string, string> | undefined, catalog: Dish[]): { slot: string; cat: Cat; dish: Dish }[] {
  const cats: Cat[] = ['starter', 'main', 'dessert'];
  return cats.flatMap((cat) =>
    Object.keys(rows ?? {})
      .filter((slot) => slot.startsWith(cat))
      .sort()
      .map((slot) => ({ slot, cat, dish: catalogDish(catalog, rows![slot]) })),
  );
}

/** Plats d'une catégorie, du plus aimé au moins aimé (les nouveaux plats, sans avis, en dernier). */
export const bestOf = (catalog: Dish[], cat: Cat) => catalog.filter((d) => d.cat === cat).sort((a, b) => b.likes - a.likes);

/** Total dépensé dans le journal des achats. */
export const spentOf = (purchases: Purchase[]) => purchases.reduce((s, p) => s + p.amount, 0);

export type { Allergen };

/**
 * Envoie une photo de plat dans Supabase Storage (bucket « dishes »).
 * La photo est lue en mémoire puis envoyée telle quelle ;
 * en cas d'échec, le message d'erreur est renvoyé pour être affiché. Abandon après 40 secondes.
 */
export async function uploadDishImage(uri: string, mime?: string | null, base64?: string | null): Promise<{ url?: string; error?: string }> {
  const type = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const put = async (body: any) => {
    const { error } = await supabase.storage.from('dishes').upload(path, body, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from('dishes').getPublicUrl(path).data.publicUrl;
  };

  const work = (async () => {
    // Vérifie que la session de l'administrateur est bien active.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) throw new Error('Session expirée : reconnecte-toi.');
    const tries: (() => Promise<string>)[] = [];
    if (Platform.OS === 'web') tries.push(async () => put(await (await fetch(uri)).blob()));
    else {
      // 1) Octets fournis par le sélecteur de photos (base64) : la méthode la plus fiable sur téléphone.
      if (base64) {
        tries.push(async () => {
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          if (bytes.length < 1000) throw new Error('Photo illisible (données vides)');
          return put(bytes);
        });
      }
      // 2) Lecture du fichier par son adresse.
      tries.push(async () => {
        const bytes = await (await fetch(uri)).arrayBuffer();
        if (bytes.byteLength < 1000) throw new Error('Photo illisible (fichier vide)');
        return put(bytes);
      });
      // 3) Lecture par le système de fichiers d'Expo.
      tries.push(async () => {
        const bytes = await (new File(uri) as any).bytes();
        if (!bytes || bytes.length < 1000) throw new Error('Photo illisible (lecture impossible)');
        return put(bytes);
      });
    }
    let last = 'Échec inconnu';
    for (const t of tries) {
      try {
        return { url: await t() };
      } catch (e) {
        last = (e as Error).message || last;
        console.warn('Envoi de la photo :', last);
      }
    }
    return { error: last };
  })();
  const timeout = new Promise<{ error: string }>((resolve) => setTimeout(() => resolve({ error: 'Délai dépassé (40 s). Vérifie ta connexion.' }), 40000));
  try {
    return await Promise.race([work, timeout]);
  } catch (e) {
    return { error: (e as Error).message };
  }
}
