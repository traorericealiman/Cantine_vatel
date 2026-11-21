/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CREDIT_FEE_RATE, MAX_CREDIT_DISHES, OFFERS, discounted, remaining, setAvailability } from '../src/lib/data';
import { allergyHits, categoryTaken, simulate, topup } from '../src/lib/rules';
import type { Order } from '../src/lib/types';

const wallet = { balance: 0, debt: 0, creditCount: 0, txs: [] };

test('recharge : la dette est remboursée en premier', () => {
  const r = topup({ ...wallet, balance: 0, debt: 1000, creditCount: 1 }, 5000);
  assert.equal(r.debt, 0);
  assert.equal(r.balance, 4000);
  assert.equal(r.creditCount, 0, 'dette soldée : le compteur de crédits repart à zéro');
  assert.deepEqual(r.txs.map((t) => t.kind), ['topup', 'debt']);
});

test('recharge : une dette plus grande que la recharge reste due', () => {
  const r = topup({ ...wallet, debt: 3000, creditCount: 2 }, 1000);
  assert.equal(r.debt, 2000);
  assert.equal(r.balance, 0);
  assert.equal(r.creditCount, 2);
});

test('crédit d\u2019urgence : 1er plat sans frais, suivants avec frais, puis refus', () => {
  const q = simulate(0, 0, [1000, 1000, 1000, 1000]);
  assert.equal(q[0].fee, 0);
  assert.equal(q[0].credit, true);
  assert.equal(q[1].fee, Math.round(1000 * CREDIT_FEE_RATE));
  assert.equal(q.filter((x) => x.credit).length, MAX_CREDIT_DISHES);
  assert.equal(q[MAX_CREDIT_DISHES].refused, 'limit');
});

test('commande payée par le solde quand il suffit', () => {
  const q = simulate(2500, 0, [1000, 1000, 1000]);
  assert.deepEqual(q.map((x) => x.credit), [false, false, true]);
});

test('un seul plat par catégorie et par jour', () => {
  const order = (dishId: string, date: string): Order => ({ id: dishId + date, dishId, date, removed: [], price: 0, fee: 0, onCredit: false, status: 'ordered' });
  const orders = [order('garba', '2026-11-23')];
  assert.equal(categoryTaken(orders, 'poulet', '2026-11-23'), true, 'deux plats de résistance le même jour');
  assert.equal(categoryTaken(orders, 'poulet', '2026-11-24'), false, 'un autre jour');
  assert.equal(categoryTaken(orders, 'garba', '2026-11-23'), false, 'le même plat n\u2019est pas un conflit');
});

test('allergies : cases cochées et saisie libre sans accents', () => {
  const hits = allergyHits(
    { id: 'soupe', fr: 'Soupe de poisson', en: 'Fish soup', cat: 'starter', price: 500, emoji: '', table: 'D', likes: 0, votes: 0, allergens: ['fish'], components: [{ id: 'l', fr: 'Légumes', en: 'Vegetables', removable: false }] },
    ['fish'],
    ['legumes', 'le'],
    'fr',
  );
  assert.equal(hits.length, 2, 'le poisson coché + « legumes » saisi ; « le » est trop court');
});

test('offres : -5 % semaine, -7 % mois, -15 % année sur un plat à 1 000 F', () => {
  const byId = Object.fromEntries(OFFERS.map((o) => [o.id, o.pct]));
  assert.deepEqual([byId.week, byId.month, byId.year], [5, 7, 15]);
  assert.equal(discounted(1000, 5), 950);
  assert.equal(discounted(1000, 7), 930);
  assert.equal(discounted(1000, 15), 850);
  assert.equal(discounted(1000, 0), 1000);
  assert.equal(discounted(250, 15), 213, 'arrondi comme la base de données');
});

test('quota : plats restants, complet à zéro, illimité sans quota', () => {
  setAvailability([{ day: '2026-11-23', dish_id: 'garba', capacity: 15, ordered: 14 }, { day: '2026-11-23', dish_id: 'poulet', capacity: 2, ordered: 5 }]);
  assert.equal(remaining('2026-11-23', 'garba'), 1);
  assert.equal(remaining('2026-11-23', 'poulet'), 0, 'jamais négatif');
  assert.equal(remaining('2026-11-23', 'tcheb'), null, 'pas de quota = illimité');
});
