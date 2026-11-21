import { useMemo } from 'react';
import { create } from 'zustand';
import {
  Allergen,
  Dish,
  DISHES,
  PROMO,
  SERVICE,
  SETTINGS,
  ARCHIVED,
  addDays,
  setCreditRule,
  dateKey,
  dishById,
  isOpen,
  setDbMenu,
} from '../lib/data';
import { registerForPush, unregisterPush } from '../lib/push';
import { emailOf, supabase } from '../lib/supabase';
import { Key, Lang, detectLang, translate } from '../lib/i18n';
import { allergyHits, categoryTaken, nextId, simulate, strip, topup } from '../lib/rules';
import type { Child, DbNotif, Order, Proposal, Quote, Role, Rule, Tx, Wallet } from '../lib/types';

export { allergyHits, categoryTaken, simulate, topup };
export type { Child, DbNotif, Order, Proposal, Quote, Role, Rule, Tx, Wallet };

/** Enfants rattachés au parent de démonstration. `c1` est l'élève de démonstration (mêmes données que son espace). */
export const AYA_ID = 'c1';
/** Enfants du parent connecté (chargés depuis la base à la connexion). */
export const CHILDREN: Child[] = [];

interface State {
  lang: Lang;
  role: Role;
  signedIn: boolean;
  /** false tant que la session enregistrée n'a pas été relue au démarrage. */
  ready: boolean;
  uid: string | null;
  /** Faux tant que les premières données n'ont pas été chargées après la connexion. */
  dataReady: boolean;
  notifs: DbNotif[];
  /** Signalements « plat non reçu » de l'élève, par commande. */
  issues: Record<string, 'open' | 'refunded' | 'resolved'>;
  reportIssue: (orderId: string) => void;
  markNotifsRead: () => void;
  mustChangePassword: boolean;
  allergiesDone: boolean;
  user: { name: string; first: string; matricule: string };
  balance: number;
  debt: number;
  creditCount: number;
  allergies: Allergen[];
  customAllergies: string[];
  dismissedTurns: string[];
  orders: Order[];
  txs: Tx[];
  rules: Rule[];
  proposals: Proposal[];
  called: Record<string, string[]>;
  online: boolean;
  balanceHidden: boolean;
  appVote?: 1 | -1;
  parentAppVote?: 1 | -1;
  // espace parent
  selectedChild: string;
  lowThreshold: number;
  subscriptions: Record<string, boolean>;
  siblings: Record<string, Wallet>;

  setLang: (l: Lang) => void;
  login: (matricule: string, password: string) => Promise<'ok' | 'first' | 'empty' | 'wrong' | 'error'>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  scanPickup: (token: string, at?: Date) => Promise<number | 'bad' | 'error'>;
  queueScan: (token: string) => void;
  pendingScans: { token: string; at: number }[];
  finishFirstLogin: (temp: string, newP: string) => Promise<boolean>;
  finishOnboarding: () => void;
  changePassword: (oldP: string, newP: string) => Promise<boolean>;
  logout: () => void;
  recharge: (amount: number) => void;
  toggleAllergy: (a: Allergen) => void;
  addCustomAllergy: (name: string) => void;
  removeCustomAllergy: (name: string) => void;
  dismissTurn: (id: string) => void;
  placeOrder: (dishId: string, date: string, removed: string[]) => 'ok' | 'closed' | 'limit' | 'duplicate' | 'category';
  cancelOrder: (id: string) => void;
  confirmReceived: (id: string) => void;
  voteOrder: (id: string, v: 1 | -1) => void;
  commentOrder: (id: string, text: string) => void;
  setOnline: (v: boolean) => void;
  toggleBalanceHidden: () => void;
  setAppVote: (v: 1 | -1) => void;
  setParentAppVote: (v: 1 | -1) => void;
  sendFeedback: (note: string) => void;
  setFavoriteMode: (id: string, mode: 'off' | 'ask' | 'auto') => void;
  addFavorite: (dishId: string) => void;
  removeRule: (id: string) => void;
  answerProposal: (id: string, accept: boolean) => 'ok' | 'declined' | 'closed' | 'category' | 'limit' | 'gone';
  /** Dernière commande refusée par le serveur (pour l'expliquer à l'élève). */
  orderError: { code: string; at: number } | null;
  selectChild: (id: string) => void;
  rechargeChild: (id: string, amount: number) => void;
  subscribe: (id: string) => void;
  setLowThreshold: (n: number) => void;
}

// ---------- Synchronisation avec Supabase

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

const mapNotif = (r: any): DbNotif => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  data: r.data ?? {},
  read: r.read,
  at: Date.parse(r.created_at),
});

const mapOrder = (r: any): Order => ({
  id: r.id,
  dishId: r.dish_id,
  date: r.day,
  removed: r.removed ?? [],
  price: r.price,
  fee: r.fee,
  onCredit: r.on_credit,
  status: r.status,
  receivedAt: r.received_at ? Date.parse(r.received_at) : undefined,
  vote: r.vote ?? undefined,
  comment: r.comment ?? undefined,
});

async function fetchWallet(sid: string): Promise<Wallet> {
  const [w, o, t] = await Promise.all([
    supabase.from('wallets').select('balance,debt,credit_count').eq('student_id', sid).maybeSingle(),
    supabase.from('orders').select('*').eq('student_id', sid).neq('status', 'cancelled').order('day'),
    supabase.from('wallet_transactions').select('*').eq('student_id', sid).order('at', { ascending: false }).limit(200),
  ]);
  const txs: Tx[] = (t.data ?? [])
    .filter((r: any) => r.kind !== 'subscription')
    .map((r: any) => ({ id: r.id, kind: r.kind, dishId: r.dish_id ?? undefined, amount: r.amount, credit: r.credit, at: Date.parse(r.at) }))
    .reverse();
  return {
    balance: w.data?.balance ?? 0,
    debt: w.data?.debt ?? 0,
    creditCount: w.data?.credit_count ?? 0,
    orders: (o.data ?? []).map(mapOrder),
    txs,
  };
}

/** Réglages de la cantine et menus publiés : communs à tous les rôles. */
export async function loadGlobal(): Promise<Record<string, string[]>> {
  const [s, m, c, rt, ds] = await Promise.all([
    supabase.from('settings').select('cutoff_minutes,standard_price,promo_dish_price,promo_fee,service_mode,max_credit,credit_fee_rate,demo_mode').eq('id', 1).maybeSingle(),
    supabase.from('menu_items').select('day,slot,dish_id').eq('published', true).gte('day', dateKey(addDays(new Date(), -14))),
    supabase.from('service_calls').select('day,dish_id,table_letter,called_at').gte('day', dateKey(addDays(new Date(), -1))),
    supabase.rpc('dish_ratings'),
    supabase.from('dishes').select('id,fr,en,cat,price,emoji,custom,components,allergens,active,image'),
  ]);
  // La liste des plats vient de la base : un plat ajouté par l'admin apparaît chez les élèves.
  if (ds.data && ds.data.length) {
    const rank = (c: string) => (c === 'starter' ? 0 : c === 'main' ? 1 : 2);
    const all: (Dish & { active: boolean })[] = ds.data
      .map((r: any) => ({
        active: r.active,
        image: r.image ?? undefined,
        id: r.id,
        fr: r.fr,
        en: r.en,
        cat: r.cat,
        price: r.price,
        emoji: r.emoji,
        custom: r.custom,
        components: r.components ?? [],
        allergens: r.allergens ?? [],
        likes: 0,
        votes: 0,
        table: 'A',
      }))
      .sort((a: Dish, b: Dish) => rank(a.cat) - rank(b.cat) || a.fr.localeCompare(b.fr));
    DISHES.splice(0, DISHES.length, ...all.filter((d) => d.active));
    ARCHIVED.splice(0, ARCHIVED.length, ...all.filter((d) => !d.active));
  }
  // Avis réels : pourcentage de 👍 et nombre de votes par plat (« Nouveau » tant qu'aucun avis).
  if (rt.data) {
    const byDish = new Map<string, { votes: number; likes: number }>(rt.data.map((r: any) => [r.dish_id, r]));
    DISHES.forEach((d) => {
      const r = byDish.get(d.id);
      d.votes = r?.votes ?? 0;
      d.likes = r?.likes ?? 0;
    });
  }
  const called: Record<string, string[]> = {};
  SERVICE.tables = {};
  (c.data ?? []).forEach((r: any) => {
    if (r.table_letter) SERVICE.tables[`${r.day}|${r.dish_id}`] = r.table_letter;
    if (r.called_at) (called[r.day] ??= []).push(r.dish_id);
  });
  if (s.data) {
    SERVICE.mode = s.data.service_mode;
    SETTINGS.demo = !!s.data.demo_mode;
    setCreditRule(s.data.max_credit, Number(s.data.credit_fee_rate));
    SETTINGS.cutoff = s.data.cutoff_minutes;
    PROMO.dishPrice = s.data.promo_dish_price;
    PROMO.standardPrice = s.data.standard_price;
    PROMO.fee = s.data.promo_fee;
  }
  if (m.data) {
    const rank = (slot: string) => (slot.startsWith('starter') ? 0 : slot.startsWith('dessert') ? 2 : 1);
    const rows = [...m.data].sort((a: any, b: any) => rank(a.slot) - rank(b.slot) || a.slot.localeCompare(b.slot));
    const menu: Record<string, string[]> = {};
    rows.forEach((r: any) => (menu[r.day] ??= []).push(r.dish_id));
    setDbMenu(menu);
  }
  return called;
}

let liveChannel: ReturnType<typeof supabase.channel> | null = null;
let liveTimer: ReturnType<typeof setInterval> | null = null;
/** Appels de plats en direct (temps réel) + relecture régulière du mode de service et des menus. */
function startLive(refresh: () => void) {
  stopLive();
  liveChannel = supabase
    .channel('service-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, () => refresh())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => refresh())
    .subscribe();
  liveTimer = setInterval(refresh, 20000);
}
function stopLive() {
  if (liveChannel) supabase.removeChannel(liveChannel);
  if (liveTimer) clearInterval(liveTimer);
  liveChannel = null;
  liveTimer = null;
}

export const useApp = create<State>((set, get) => {
  /** Relit ce que le serveur sait de l'utilisateur connecté et remplace l'état local. */
  const loadUser = async (uid: string): Promise<'ok' | 'first' | 'wrong'> => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (!p) return 'wrong';
    set({
      uid,
      signedIn: true,
      role: p.role,
      user: { name: p.full_name, first: p.first_name, matricule: p.login },
      mustChangePassword: p.must_change_password,
      allergiesDone: p.allergies_done,
      allergies: p.allergies ?? [],
      customAllergies: p.custom_allergies ?? [],
      lowThreshold: p.low_threshold,
      appVote: p.app_vote ?? undefined,
      parentAppVote: p.app_vote ?? undefined,
    });
    // On entre dans l'app tout de suite : les données (solde, menus…) se chargent en arrière-plan.
    const loading = get()
      .refresh()
      .catch((e) => console.warn('Chargement après connexion :', e));
    // L'espace parent a besoin de la liste de ses enfants pour s'afficher : on l'attend.
    if (p.role === 'parent') await loading;
    startLive(() => get().refresh());
    // Le téléphone demande l'autorisation des notifications dès la connexion.
    registerForPush(uid);
    return p.must_change_password ? 'first' : 'ok';
  };

  const saveProfile = (patch: Record<string, unknown>) => {
    const uid = get().uid;
    if (uid) supabase.from('profiles').update(patch).eq('id', uid).then(() => {});
  };
  const later = (q: PromiseLike<unknown>) =>
    q.then(
      () => get().refresh(),
      () => get().refresh(),
    );

  return {
    lang: detectLang(),
    role: 'student',
    signedIn: false,
    ready: false,
    uid: null,
    dataReady: false,
    orderError: null,
    notifs: [],
    issues: {},
    reportIssue: (orderId) => {
      set((s) => ({ issues: { ...s.issues, [orderId]: 'open' } }));
      later(supabase.rpc('report_issue', { p_order: orderId }));
    },
    markNotifsRead: () => {
      const uid = get().uid;
      if (!uid || !get().notifs.some((n) => !n.read)) return;
      set((s) => ({ notifs: s.notifs.map((n) => ({ ...n, read: true })) }));
      supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false).then(() => {});
    },
    mustChangePassword: false,
    allergiesDone: true,
    user: { name: '', first: '', matricule: '' },
    balance: 0,
    debt: 0,
    creditCount: 0,
    allergies: [],
    customAllergies: [],
    dismissedTurns: [],
    orders: [],
    txs: [],
    rules: [],
    proposals: [],
    called: {},
    online: true,
    balanceHidden: false,
    selectedChild: AYA_ID,
    lowThreshold: 2000,
    subscriptions: {},
    siblings: {},

    setLang: (lang) => set({ lang }),

    login: async (matricule, password) => {
      if (!matricule.trim() || !password) return 'empty';
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailOf(matricule), password });
      // Identifiants refusés (400) : « wrong » ; toute autre panne (réseau, serveur) : « error », pour ne pas accuser le mot de passe.
      if (error) return error.status === 400 || /invalid/i.test(error.message) ? 'wrong' : 'error';
      if (!data.user) return 'wrong';
      try {
        return await loadUser(data.user.id);
      } catch (e) {
        console.warn('Connexion :', e);
        return 'error';
      }
    },
    restore: async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) await loadUser(data.session.user.id);
      } catch {}
      set({ ready: true });
    },
    refresh: async () => {
      const s = get();
      if (!s.uid) return;
      // Toutes les 20 secondes, on retente d'envoyer les scans restés en attente.
      if (s.pendingScans.length) get().setOnline(true);
      const globalP = loadGlobal().then((called) => set({ called }));
      if (s.role === 'student') {
        const [w, f, pr, sub, nf, iss] = await Promise.all([
          fetchWallet(s.uid),
          supabase.from('favorites').select('id,dish_id,auto_order,ask').order('created_at', { ascending: true }).order('id', { ascending: true }),
          supabase.from('proposals').select('*').eq('status', 'pending'),
          supabase.from('subscriptions').select('ends_on').eq('student_id', s.uid).maybeSingle(),
          supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60),
          supabase.from('issues').select('order_id,status'),
        ]);
        set({
          issues: Object.fromEntries((iss.data ?? []).filter((r: any) => r.order_id).map((r: any) => [r.order_id, r.status])),
          notifs: (nf.data ?? []).map(mapNotif),
          subscriptions: { ...get().subscriptions, [s.uid]: !!sub.data && sub.data.ends_on >= dateKey(new Date()) },
          balance: w.balance,
          debt: w.debt,
          creditCount: w.creditCount,
          orders: w.orders,
          txs: w.txs,
          rules: (f.data ?? []).map((r: any) => ({ id: r.id, dishId: r.dish_id, active: r.auto_order, ask: r.ask })),
          proposals: (pr.data ?? []).map((r: any) => ({ id: r.id, ruleId: r.favorite_id ?? '', dishId: r.dish_id, date: r.day, status: r.status })),
        });
      } else if (s.role === 'admin') {
        const nf = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60);
        set({ notifs: (nf.data ?? []).map(mapNotif) });
      } else if (s.role === 'parent') {
        const { data: links } = await supabase.from('parent_links').select('student_id');
        const ids = (links ?? []).map((l: any) => l.student_id);
        const [profs, subs, wallets] = await Promise.all([
          supabase.from('profiles').select('id,full_name,first_name,login').in('id', ids),
          supabase.from('subscriptions').select('student_id,ends_on').in('student_id', ids),
          Promise.all(ids.map((id: string) => fetchWallet(id))),
        ]);
        const list: Child[] = (profs.data ?? []).map((p: any) => ({ id: p.id, name: p.full_name, first: p.first_name, matricule: p.login }));
        CHILDREN.length = 0;
        CHILDREN.push(...list);
        const siblings: Record<string, Wallet> = {};
        ids.forEach((id: string, i: number) => (siblings[id] = wallets[i]));
        const today = dateKey(new Date());
        const subscriptions: Record<string, boolean> = {};
        (subs.data ?? []).forEach((r: any) => (subscriptions[r.student_id] = r.ends_on >= today));
        const nf = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60);
        set({ notifs: (nf.data ?? []).map(mapNotif), siblings, subscriptions, selectedChild: ids.includes(s.selectedChild) ? s.selectedChild : (ids[0] ?? s.selectedChild) });
      }
      await globalP;
      set({ dataReady: true });
    },
    pendingScans: [],
    queueScan: (token) =>
      set((s) => ({
        pendingScans: [...s.pendingScans, { token, at: Date.now() }],
        orders: s.orders.map((o) => (o.status === 'ordered' && o.date === dateKey(new Date()) ? { ...o, status: 'received', receivedAt: Date.now(), syncPending: true } : o)),
      })),
    scanPickup: async (token, at) => {
      const { data, error } = await supabase.rpc('confirm_pickup', { p_token: token, p_scanned_at: (at ?? new Date()).toISOString() });
      if (error) return error.message.includes('bad_qr') ? 'bad' : 'error';
      await get().refresh();
      return (data as number) ?? 0;
    },
    finishFirstLogin: async (temp, newP) => {
      const s = get();
      const re = await supabase.auth.signInWithPassword({ email: emailOf(s.user.matricule), password: temp });
      if (re.error) return false;
      const { error } = await supabase.auth.updateUser({ password: newP });
      if (error) return false;
      saveProfile({ must_change_password: false });
      set({ mustChangePassword: false });
      return true;
    },
    finishOnboarding: () => {
      saveProfile({ allergies_done: true });
      set({ allergiesDone: true });
    },
    changePassword: async (oldP, newP) => {
      const re = await supabase.auth.signInWithPassword({ email: emailOf(get().user.matricule), password: oldP });
      if (re.error) return false;
      const { error } = await supabase.auth.updateUser({ password: newP });
      return !error;
    },
    logout: () => {
      stopLive();
      unregisterPush().finally(() => supabase.auth.signOut());
      CHILDREN.length = 0;
      set({
        signedIn: false,
        uid: null,
        dataReady: false,
        mustChangePassword: false,
        orders: [],
        txs: [],
        rules: [],
        proposals: [],
        siblings: {},
        notifs: [],
        balance: 0,
        debt: 0,
        creditCount: 0,
        allergies: [],
        customAllergies: [],
      });
    },

    recharge: (amount) => {
      set((s) => topup(s, amount));
      const uid = get().uid;
      if (uid) later(supabase.rpc('demo_topup', { p_student: uid, p_amount: amount }));
    },

    selectChild: (id) => set({ selectedChild: id }),
    rechargeChild: (id, amount) => {
      set((s) => {
        const w = s.siblings[id];
        return w ? { siblings: { ...s.siblings, [id]: { ...w, ...topup(w, amount) } } } : s;
      });
      later(supabase.rpc('demo_topup', { p_student: id, p_amount: amount }));
    },
    subscribe: (id) => {
      set((s) => ({ subscriptions: { ...s.subscriptions, [id]: true } }));
      later(supabase.rpc('demo_subscribe', { p_student: id }));
    },
    setLowThreshold: (n) => {
      const v = Math.max(0, Math.round(n));
      set({ lowThreshold: v });
      saveProfile({ low_threshold: v });
    },

    addCustomAllergy: (name) =>
      set((s) => {
        const n = name.trim();
        if (!n || s.customAllergies.some((c) => strip(c) === strip(n))) return s;
        const next = [...s.customAllergies, n];
        saveProfile({ custom_allergies: next });
        return { customAllergies: next };
      }),
    removeCustomAllergy: (name) =>
      set((s) => {
        const next = s.customAllergies.filter((c) => c !== name);
        saveProfile({ custom_allergies: next });
        return { customAllergies: next };
      }),
    dismissTurn: (id) => set((s) => ({ dismissedTurns: s.dismissedTurns.includes(id) ? s.dismissedTurns : [...s.dismissedTurns, id] })),

    toggleAllergy: (a) =>
      set((s) => {
        const next = s.allergies.includes(a) ? s.allergies.filter((x) => x !== a) : [...s.allergies, a];
        saveProfile({ allergies: next });
        return { allergies: next };
      }),

    placeOrder: (dishId, date, removed) => {
      const s = get();
      if (!isOpen(date)) return 'closed';
      if (s.orders.some((o) => o.dishId === dishId && o.date === date)) return 'duplicate';
      if (categoryTaken(s.orders, dishId, date)) return 'category';
      const dish = dishById(dishId);
      const q = simulate(s.balance, s.creditCount, [dish.price])[0];
      if (q.refused) return 'limit';
      const order: Order = {
        id: nextId('o'),
        dishId,
        date,
        removed,
        price: dish.price,
        fee: q.fee,
        onCredit: q.credit,
        status: 'ordered',
      };
      set({
        orders: [...s.orders, order],
        txs: [...s.txs, { id: nextId('t'), kind: 'order', dishId, amount: -(dish.price + q.fee), credit: q.credit, at: Date.now() }],
        balance: q.credit ? s.balance : s.balance - dish.price,
        debt: q.credit ? s.debt + dish.price + q.fee : s.debt,
        creditCount: q.credit ? s.creditCount + 1 : s.creditCount,
      });
      if (s.uid)
        later(
          supabase.rpc('place_order', { p_dish: dishId, p_day: date, p_removed: removed }).then((r) => {
            if (r.error) set({ orderError: { code: r.error.message, at: Date.now() } });
            return r;
          }),
        );
      return 'ok';
    },

    cancelOrder: (id) =>
      set((s) => {
        const o = s.orders.find((x) => x.id === id);
        if (!o || o.status !== 'ordered' || !isOpen(o.date) || s.called[o.date]?.includes(o.dishId)) return s;
        if (isUuid(id)) later(supabase.rpc('cancel_order', { p_order: id }));
        return {
          orders: s.orders.filter((x) => x.id !== id),
          txs: [...s.txs, { id: nextId('t'), kind: 'refund', dishId: o.dishId, amount: o.price + o.fee, credit: o.onCredit, at: Date.now() }],
          balance: o.onCredit ? s.balance : s.balance + o.price,
          debt: o.onCredit ? Math.max(0, s.debt - o.price - o.fee) : s.debt,
          creditCount: o.onCredit ? Math.max(0, s.creditCount - 1) : s.creditCount,
        };
      }),

    confirmReceived: (id) =>
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === id && o.status === 'ordered'
            ? { ...o, status: 'received', receivedAt: Date.now(), syncPending: !s.online }
            : o,
        ),
      })),

    voteOrder: (id, v) => {
      if (isUuid(id)) supabase.rpc('rate_order', { p_order: id, p_vote: v }).then(() => {});
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? (o.vote === v ? { ...o, vote: undefined, comment: undefined } : { ...o, vote: v }) : o)),
      }));
    },
    commentOrder: (id, text) => {
      const cur = get().orders.find((x) => x.id === id);
      if (cur?.vote && isUuid(id)) supabase.rpc('rate_order', { p_order: id, p_vote: cur.vote, p_comment: text }).then(() => {});
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, comment: text } : o)) }));
    },

    setOnline: (online) => {
      set((s) => ({
        online,
        orders: online ? s.orders.map((o) => (o.syncPending ? { ...o, syncPending: false } : o)) : s.orders,
      }));
      // Retour du réseau : on envoie les scans faits hors connexion (ceux qui échouent encore restent en attente).
      if (online && get().pendingScans.length) {
        const queue = get().pendingScans;
        set({ pendingScans: [] });
        queue.forEach(async (q) => {
          const r = await get().scanPickup(q.token, new Date(q.at));
          if (r === 'error') set((s) => ({ pendingScans: [...s.pendingScans, q] }));
        });
      }
    },

    setAppVote: (v) => {
      set({ appVote: v });
      saveProfile({ app_vote: v });
    },
    setParentAppVote: (v) => {
      set({ parentAppVote: v });
      saveProfile({ app_vote: v });
    },
    sendFeedback: (note) => {
      const s = get();
      const vote = s.role === 'parent' ? s.parentAppVote : s.appVote;
      supabase.from('app_feedback').insert({ vote: vote ?? null, note: note.trim() || null }).then(() => {});
    },
    toggleBalanceHidden: () => set((s) => ({ balanceHidden: !s.balanceHidden })),

    // Trois choix par favori : désactivé, « me demander » (proposition Oui / Non) ou commande automatique.
    setFavoriteMode: (id, mode) => {
      set((s) => ({
        rules: s.rules.map((r) => (r.id === id ? { ...r, active: mode === 'auto', ask: mode === 'ask' } : r)),
        proposals: mode === 'off' || mode === 'auto' ? s.proposals.filter((p) => !(p.ruleId === id && p.status === 'pending')) : s.proposals,
      }));
      if (isUuid(id)) later(supabase.from('favorites').update({ auto_order: mode === 'auto', ask: mode === 'ask' }).eq('id', id));
    },
    addFavorite: (dishId) => {
      const s = get();
      if (s.rules.some((r) => r.dishId === dishId)) return;
      set({ rules: [...s.rules, { id: nextId('r'), dishId, active: false, ask: false }] });
      if (s.uid) later(supabase.from('favorites').insert({ student_id: s.uid, dish_id: dishId, auto_order: false }));
    },
    removeRule: (id) => {
      set((s) => ({
        rules: s.rules.filter((r) => r.id !== id),
        proposals: s.proposals.filter((p) => !(p.ruleId === id && p.status === 'pending')),
      }));
      if (isUuid(id)) later(supabase.from('favorites').delete().eq('id', id));
    },

    answerProposal: (id, accept) => {
      const p = get().proposals.find((x) => x.id === id);
      if (!p || p.status !== 'pending') return 'gone';
      if (!accept) {
        set((s) => ({ proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: 'declined' } : x)) }));
        if (isUuid(id)) later(supabase.from('proposals').update({ status: 'declined' }).eq('id', id));
        return 'declined';
      }
      const res = get().placeOrder(p.dishId, p.date, []);
      if (res === 'ok' || res === 'duplicate') {
        set((s) => ({ proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: 'accepted' } : x)) }));
        return 'ok';
      }
      return res;
    },
  };
});

const NO_ORDERS: Order[] = [];
const NO_TXS: Tx[] = [];

/** Wallet d'un enfant. Aya partage les données de l'espace élève ; les autres enfants ont leur propre wallet. */
export function useChildWallet(id: string): Wallet {
  const own = id === AYA_ID;
  const balance = useApp((s) => (own ? s.balance : (s.siblings[id]?.balance ?? 0)));
  const debt = useApp((s) => (own ? s.debt : (s.siblings[id]?.debt ?? 0)));
  const creditCount = useApp((s) => (own ? s.creditCount : (s.siblings[id]?.creditCount ?? 0)));
  const orders = useApp((s) => (own ? s.orders : (s.siblings[id]?.orders ?? NO_ORDERS)));
  const txs = useApp((s) => (own ? s.txs : (s.siblings[id]?.txs ?? NO_TXS)));
  return useMemo(() => ({ balance, debt, creditCount, orders, txs }), [balance, debt, creditCount, orders, txs]);
}

/** Traduction + langue courante, mises à jour dès que la langue change. */
export function useI18n() {
  const lang = useApp((s) => s.lang);
  return useMemo(
    () => ({
      lang,
      t: (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
    }),
    [lang],
  );
}
