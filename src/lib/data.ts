export type Cat = 'starter' | 'main' | 'dessert';
export type Allergen = 'peanut' | 'fish' | 'gluten' | 'milk' | 'egg' | 'shellfish';

export const ALLERGENS: Allergen[] = ['peanut', 'fish', 'gluten', 'milk', 'egg', 'shellfish'];

export interface Component {
  id: string;
  fr: string;
  en: string;
  removable?: boolean;
}

export interface Dish {
  id: string;
  fr: string;
  en: string;
  cat: Cat;
  price: number;
  emoji: string;
  components: Component[];
  allergens: Allergen[];
  likes: number; // % de pouces verts
  votes: number;
  up?: number; // nombre de 👍
  down?: number; // nombre de 👎
  custom?: boolean;
  table: string;
  /** Adresse de la photo (Supabase Storage). Sans photo : image locale du plat, sinon emoji. */
  image?: string;
}

const c = (id: string, fr: string, en: string, removable = false): Component => ({ id, fr, en, removable });

export const DISHES: Dish[] = [
  {
    id: 'salade',
    fr: 'Salade de crudités',
    en: 'Fresh vegetable salad',
    cat: 'starter',
    price: 400,
    emoji: '🥗',
    components: [c('tomate', 'Tomate', 'Tomato'), c('concombre', 'Concombre', 'Cucumber'), c('carotte', 'Carotte', 'Carrot'), c('vinaigrette', 'Vinaigrette', 'Vinaigrette')],
    allergens: [],
    likes: 81,
    votes: 64,
    table: 'D',
  },
  {
    id: 'soupe',
    fr: 'Soupe de poisson',
    en: 'Fish soup',
    cat: 'starter',
    price: 500,
    emoji: '🥣',
    components: [c('poisson', 'Poisson', 'Fish'), c('legumes', 'Légumes', 'Vegetables'), c('piment', 'Piment', 'Chili')],
    allergens: ['fish'],
    likes: 77,
    votes: 52,
    table: 'D',
  },
  {
    id: 'garba',
    fr: 'Garba',
    en: 'Garba',
    cat: 'main',
    price: 1000,
    emoji: '🍛',
    custom: true,
    components: [
      c('attieke', 'Attiéké', 'Cassava couscous'),
      c('thon', 'Thon frit', 'Fried tuna'),
      c('oignon', 'Oignon', 'Onion', true),
      c('tomate', 'Tomate', 'Tomato', true),
      c('piment', 'Piment', 'Chili', true),
      c('citron', 'Citron', 'Lemon', true),
    ],
    allergens: ['fish'],
    likes: 92,
    votes: 318,
    table: 'B',
  },
  {
    id: 'att-poisson',
    fr: 'Attiéké poisson',
    en: 'Attiéké with fish',
    cat: 'main',
    price: 1000,
    emoji: '🐟',
    custom: true,
    components: [
      c('attieke', 'Attiéké', 'Cassava couscous'),
      c('poisson', 'Poisson braisé', 'Grilled fish'),
      c('oignon', 'Oignon', 'Onion', true),
      c('tomate', 'Tomate', 'Tomato', true),
      c('piment', 'Piment', 'Chili', true),
    ],
    allergens: ['fish'],
    likes: 88,
    votes: 271,
    table: 'A',
  },
  {
    id: 'tcheb',
    fr: 'Tchèp',
    en: 'Tchèp (rice and fish)',
    cat: 'main',
    price: 1000,
    emoji: '🍚',
    components: [c('riz', 'Riz', 'Rice'), c('poisson', 'Poisson', 'Fish'), c('legumes', 'Légumes', 'Vegetables'), c('sauce', 'Sauce tomate', 'Tomato sauce')],
    allergens: ['fish'],
    likes: 90,
    votes: 296,
    table: 'C',
  },
  {
    id: 'kedjenou',
    fr: 'Kedjenou de poulet',
    en: 'Chicken kedjenou',
    cat: 'main',
    price: 1200,
    emoji: '🍲',
    custom: true,
    components: [c('poulet', 'Poulet', 'Chicken'), c('aubergine', 'Aubergine', 'Eggplant'), c('tomate', 'Tomate', 'Tomato'), c('oignon', 'Oignon', 'Onion', true), c('piment', 'Piment', 'Chili', true)],
    allergens: [],
    likes: 0,
    votes: 0,
    table: 'F',
  },
  {
    id: 'sauce-graine',
    fr: 'Riz sauce graine',
    en: 'Rice with palm nut sauce',
    cat: 'main',
    price: 1100,
    emoji: '🍲',
    components: [c('riz', 'Riz', 'Rice'), c('graine', 'Sauce graine', 'Palm nut sauce'), c('viande', 'Viande', 'Meat')],
    allergens: [],
    likes: 74,
    votes: 143,
    table: 'E',
  },
  {
    id: 'poulet',
    fr: 'Poulet braisé alloco',
    en: 'Grilled chicken with plantain',
    cat: 'main',
    price: 1200,
    emoji: '🍗',
    components: [c('poulet', 'Poulet braisé', 'Grilled chicken'), c('alloco', 'Alloco', 'Fried plantain'), c('oignon', 'Oignon', 'Onion', true), c('piment', 'Piment', 'Chili', true)],
    allergens: [],
    likes: 85,
    votes: 204,
    custom: true,
    table: 'F',
  },
  {
    id: 'gateau',
    fr: 'Gâteau à la noix de coco',
    en: 'Coconut cake',
    cat: 'dessert',
    price: 300,
    emoji: '🍰',
    components: [c('coco', 'Noix de coco', 'Coconut'), c('farine', 'Farine', 'Flour')],
    allergens: ['gluten', 'egg', 'milk'],
    likes: 83,
    votes: 97,
    table: 'D',
  },
  {
    id: 'fruits',
    fr: 'Salade de fruits',
    en: 'Fruit salad',
    cat: 'dessert',
    price: 300,
    emoji: '🍉',
    components: [c('ananas', 'Ananas', 'Pineapple'), c('papaye', 'Papaye', 'Papaya'), c('orange', 'Orange', 'Orange')],
    allergens: [],
    likes: 89,
    votes: 88,
    table: 'D',
  },
  {
    id: 'yaourt',
    fr: 'Yaourt local',
    en: 'Local yoghurt',
    cat: 'dessert',
    price: 250,
    emoji: '🥛',
    components: [c('lait', 'Lait', 'Milk'), c('sucre', 'Sucre', 'Sugar')],
    allergens: ['milk'],
    likes: 79,
    votes: 71,
    table: 'D',
  },
];

/** Plats retirés du catalogue : absents des menus, mais encore connus pour afficher d'anciennes commandes. */
export const ARCHIVED: Dish[] = [];

export const dishById = (id: string): Dish => DISHES.find((d) => d.id === id) ?? ARCHIVED.find((d) => d.id === id) ?? DISHES[0];

/** Menu par jour de la semaine (0 = lundi … 4 = vendredi). */
const WEEK_MENU: string[][] = [
  ['salade', 'tcheb', 'att-poisson', 'poulet', 'gateau'],
  ['soupe', 'garba', 'sauce-graine', 'kedjenou', 'fruits'],
  ['salade', 'tcheb', 'att-poisson', 'sauce-graine', 'yaourt'],
  ['soupe', 'garba', 'poulet', 'tcheb', 'gateau'],
  ['salade', 'att-poisson', 'garba', 'sauce-graine', 'fruits'],
];

/** Offres promotionnelles : une réduction sur le prix de chaque plat pendant une durée. Valeurs relues depuis la base (l'admin règle le prix). */
export type OfferId = 'week' | 'month' | 'year';
export interface Offer {
  id: OfferId;
  pct: number;
  days: number;
  fee: number;
}
export const OFFERS: Offer[] = [
  { id: 'week', pct: 5, days: 7, fee: 200 },
  { id: 'month', pct: 7, days: 30, fee: 800 },
  { id: 'year', pct: 15, days: 365, fee: 8000 },
];
export const offerById = (id: string): Offer => OFFERS.find((o) => o.id === id) ?? OFFERS[0];
/** Prix d'un plat après réduction (arrondi comme la base de données). */
export const discounted = (price: number, pct: number) => Math.round((price * (100 - pct)) / 100);
/** Plat de référence des exemples (« un plat à 1 000 F »). */
export const EXAMPLE_PRICE = 1000;

/** Nombre de plats par jour : quota fixé par l'admin (absent = illimité) et plats déjà pris. Clé `jour|plat`. */
export const AVAIL: Record<string, { capacity: number; ordered: number }> = {};
export function setAvailability(rows: { day: string; dish_id: string; capacity: number; ordered: number }[]) {
  Object.keys(AVAIL).forEach((k) => delete AVAIL[k]);
  rows.forEach((r) => (AVAIL[`${r.day}|${r.dish_id}`] = { capacity: r.capacity, ordered: r.ordered }));
}
/** Plats restants pour ce jour (null = pas de limite). */
export function remaining(day: string, dishId: string): number | null {
  const a = AVAIL[`${day}|${dishId}`];
  return a ? Math.max(0, a.capacity - a.ordered) : null;
}

export const CUTOFF_HOUR = 10;

/** Réglages modifiables par l'administrateur (heure limite en minutes depuis minuit). Lus par `isOpen` et les textes. */
/** Réglages partagés, relus depuis la base. `demo` : mode démonstration (recharge sans paiement, retrait assoupli). */
export const SETTINGS = { cutoff: CUTOFF_HOUR * 60, demo: true };

/** Heure limite lisible : « 10 h », « 10 h 30 » (fr) ; « 10 am », « 10:30 am » (en). */
export function cutoffLabel(lang: 'fr' | 'en', minutes = SETTINGS.cutoff): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === 'fr') return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? 'am' : 'pm';
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}
/** Règle du crédit d'urgence : réglée par l'admin dans la base, relue au démarrage. */
export let MAX_CREDIT_DISHES = 3;
export let CREDIT_FEE_RATE = 0.1;
export function setCreditRule(max: number, rate: number) {
  MAX_CREDIT_DISHES = max;
  CREDIT_FEE_RATE = rate;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isWeekday = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5;

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Les 5 prochains jours de service (aujourd'hui inclus s'il s'agit d'un jour d'école). */
export function serviceDays(now = new Date()): { key: string; date: Date }[] {
  const out: { key: string; date: Date }[] = [];
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (out.length < 5) {
    if (isWeekday(d)) out.push({ key: dateKey(d), date: new Date(d) });
    d = addDays(d, 1);
  }
  return out;
}

/** Menus publiés (chargés depuis la base). Si un jour n'y figure pas, on retombe sur la rotation par défaut. */
export const DB_MENU: Record<string, string[]> = {};
export let DB_MENU_LOADED = false;
export function setDbMenu(menu: Record<string, string[]>) {
  Object.keys(DB_MENU).forEach((k) => delete DB_MENU[k]);
  Object.assign(DB_MENU, menu);
  DB_MENU_LOADED = true;
}

export function menuFor(key: string): Dish[] {
  if (DB_MENU_LOADED) return (DB_MENU[key] ?? []).map(dishById);
  const idx = parseKey(key).getDay() - 1;
  return (WEEK_MENU[idx] ?? []).map(dishById);
}

/** Menu par défaut d'un jour (rotation hebdomadaire) : sert de point de départ quand l'admin n'a encore rien planifié. */
export function defaultMenu(key: string): { slot: string; dishId: string }[] {
  const ids = WEEK_MENU[parseKey(key).getDay() - 1] ?? [];
  return ids.map((dishId, i) => ({ slot: i === 0 ? 'starter0' : i === ids.length - 1 ? 'dessert0' : `main${i - 1}`, dishId }));
}

export function daysServing(dishId: string, now = new Date()): string[] {
  return serviceDays(now)
    .map((x) => x.key)
    .filter((k) => menuFor(k).some((d) => d.id === dishId));
}

/** Une commande est possible jusqu'à l'heure limite (réglée par l'admin) le jour même. */
export function isOpen(key: string, now = new Date()): boolean {
  const today = dateKey(now);
  if (key > today) return true;
  if (key === today) return now.getHours() * 60 + now.getMinutes() < SETTINGS.cutoff;
  return false;
}

/** Mode de service et tables choisis par l'admin (chargés depuis la base). Clé des tables : « jour|plat ». */
export const SERVICE: { mode: 'call' | 'tables'; tables: Record<string, string> } = { mode: 'call', tables: {} };

export type Service =
  | { mode: 'tables'; table: string | null }
  | { mode: 'call'; rank: number; total: number };

/** Mode « tables » : la table du plat choisie par l'admin. Mode « appel par plat » : rang du plat dans la file. */
export function serviceFor(key: string, dishId: string): Service {
  if (SERVICE.mode === 'tables') return { mode: 'tables', table: SERVICE.tables[`${key}|${dishId}`] ?? null };
  const mains = menuFor(key).filter((d) => d.cat === 'main');
  const rank = Math.max(1, mains.findIndex((d) => d.id === dishId) + 1);
  return { mode: 'call', rank, total: mains.length };
}

export interface FaqItem {
  q: { fr: string; en: string };
  a: { fr: string; en: string };
}

export const FAQ: FaqItem[] = [
  {
    q: { fr: 'Jusqu’à quand puis-je commander ?', en: 'Until when can I order?' },
    a: {
      fr: 'Les commandes ferment à {time} le jour même. Tu peux aussi commander pour toute la semaine à l’avance.',
      en: 'Orders close at {time} on the day itself. You can also order for the whole week in advance.',
    },
  },
  {
    q: { fr: 'Que se passe-t-il si mon solde est vide ?', en: 'What if my balance is empty?' },
    a: {
      fr: 'Tu peux prendre jusqu’à {max} plats à crédit. Le premier est au prix normal, les suivants coûtent {fee} % de plus. Ta dette est déduite à ta prochaine recharge.',
      en: 'You can take up to {max} meals on credit. The first one costs the normal price, the next ones cost {fee}% more. Your debt is deducted at your next top-up.',
    },
  },
  {
    q: { fr: 'Comment confirmer que j’ai reçu mon plat ?', en: 'How do I confirm I got my meal?' },
    a: {
      fr: 'Dans Mes commandes, touche « J’ai reçu mon plat ». Sans connexion, ta confirmation est envoyée dès que le réseau revient.',
      en: 'In My orders, tap “I got my meal”. Without a connection, your confirmation is sent as soon as the network is back.',
    },
  },
  {
    q: { fr: 'Puis-je annuler une commande ?', en: 'Can I cancel an order?' },
    a: {
      fr: 'Oui, jusqu’à {time} le jour du repas. Tu es remboursé immédiatement sur ton solde.',
      en: 'Yes, until {time} on the day of the meal. You are refunded immediately to your balance.',
    },
  },
  {
    q: { fr: 'Comment fonctionne l’assistant ?', en: 'How does the assistant work?' },
    a: {
      fr: 'Dis-lui par exemple « Prends le Garba pour moi ». À chaque fois que ce plat est au menu, il te demande de confirmer avant de commander.',
      en: 'Tell it for instance “Get me the Garba”. Whenever that dish is on the menu, it asks you to confirm before ordering.',
    },
  },
];

export const PARENT_FAQ: FaqItem[] = [
  {
    q: { fr: 'Comment recharger le wallet de mon enfant ?', en: 'How do I top up my child’s wallet?' },
    a: {
      fr: 'Sur l’accueil, touchez le « + » de la carte du wallet. Choisissez un montant libre ou une offre, puis confirmez. La dette éventuelle de votre enfant est déduite en premier.',
      en: 'On the home screen, tap the “+” on the wallet card. Pick an amount or an offer, then confirm. Any debt your child has is deducted first.',
    },
  },
  {
    q: { fr: 'Que se passe-t-il si le solde de mon enfant est vide ?', en: 'What if my child’s balance is empty?' },
    a: {
      fr: 'Il peut prendre jusqu’à {max} plats à crédit. Le premier est au prix normal, les suivants coûtent {fee} % de plus (frais de dépannage). Vous recevez une notification à chaque plat pris à crédit.',
      en: 'They can take up to {max} meals on credit. The first one costs the normal price, the next ones cost {fee}% more (emergency fee). You get a notification for every meal taken on credit.',
    },
  },
  {
    q: { fr: 'Puis-je commander à la place de mon enfant ?', en: 'Can I order for my child?' },
    a: {
      fr: 'Non. Votre enfant choisit et commande lui-même ses repas. Vous suivez ses commandes, ses repas reçus et les mouvements de son wallet.',
      en: 'No. Your child chooses and orders their own meals. You can follow their orders, received meals and wallet movements.',
    },
  },
  {
    q: { fr: 'Comment changer le seuil d’alerte de solde bas ?', en: 'How do I change the low-balance alert?' },
    a: {
      fr: 'Dans Profil, touchez « Alertes de solde ». Par défaut vous êtes prévenu sous 2 000 F.',
      en: 'In Profile, tap “Balance alerts”. By default you are notified below 2,000 F.',
    },
  },
  {
    q: { fr: 'Comment passer d’un enfant à l’autre ?', en: 'How do I switch between my children?' },
    a: {
      fr: 'Sur l’accueil et dans l’historique, touchez le prénom de l’enfant en haut de l’écran.',
      en: 'On the home screen and in the history, tap your child’s name at the top of the screen.',
    },
  },
];
