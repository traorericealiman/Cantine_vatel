import { Allergen, CREDIT_FEE_RATE, Dish, MAX_CREDIT_DISHES, dishById } from './data';
import { Lang, translate } from './i18n';
import type { Order, Quote, Tx, Wallet } from './types';

/** Identifiants locaux (avant que la base ne renvoie les vrais). */
let counter = 100;
export const nextId = (p: string) => `${p}${++counter}`;

/** Minuscules sans accents, pour comparer des saisies libres. */
export const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Recharge : la dette est déduite en premier, le reste va sur le wallet (section 6 des spécifications). */
export function topup(w: Pick<Wallet, 'balance' | 'debt' | 'creditCount' | 'txs'>, amount: number) {
  const payDebt = Math.min(amount, w.debt);
  const debt = w.debt - payDebt;
  const at = Date.now();
  const txs: Tx[] = [...w.txs, { id: nextId('t'), kind: 'topup', amount, at }];
  if (payDebt > 0) txs.push({ id: nextId('t'), kind: 'debt', amount: -payDebt, at });
  return { debt, txs, balance: w.balance + amount - payDebt, creditCount: debt === 0 ? 0 : w.creditCount };
}

/** Allergènes d'un plat qui concernent l'élève : types cochés + allergies saisies librement. */
export function allergyHits(dish: Dish, allergies: Allergen[], custom: string[], lang: Lang): string[] {
  const hits = dish.allergens.filter((a) => allergies.includes(a)).map((a) => translate(lang, a));
  const hay = strip([dish.fr, dish.en, ...dish.components.flatMap((c) => [c.fr, c.en])].join(' | '));
  custom.forEach((c) => {
    const n = strip(c.trim());
    if (n.length >= 3 && hay.includes(n)) hits.push(c.trim());
  });
  return hits;
}

/** Un étudiant ne peut prendre qu'un plat par catégorie et par jour (entrée, plat, dessert). */
export function categoryTaken(orders: Order[], dishId: string, date: string): boolean {
  const cat = dishById(dishId).cat;
  return orders.some((o) => o.date === date && o.dishId !== dishId && dishById(o.dishId).cat === cat);
}

/** Simule une série de commandes avec les règles de crédit d'urgence (1 sans frais, 2 avec frais). */
export function simulate(balance: number, creditCount: number, prices: number[]): Quote[] {
  let b = balance;
  let cc = creditCount;
  return prices.map((p) => {
    if (b >= p) {
      b -= p;
      return { price: p, fee: 0, credit: false };
    }
    if (cc < MAX_CREDIT_DISHES) {
      cc += 1;
      const fee = cc === 1 ? 0 : Math.round(p * CREDIT_FEE_RATE);
      return { price: p, fee, credit: true };
    }
    return { price: p, fee: 0, credit: false, refused: 'limit' as const };
  });
}
