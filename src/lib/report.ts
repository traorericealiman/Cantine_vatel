import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Dish, addDays, dateKey, serviceDays } from './data';
import { Ingredient, Issue, Purchase, Usage, spentOf, useAdmin } from '../store/admin';

/** Chiffres de la semaine, calculés une seule fois pour l'écran et pour le fichier Excel. */
export function weekFigures(catalog: Dish[], ingredients: Ingredient[], purchases: Purchase[], issues: Issue[]) {
  const st = useAdmin.getState().stats;
  const w = st.week;
  const sorted = [...catalog].filter((d) => d.votes > 0).sort((a, b) => b.likes - a.likes);
  const end = serviceDays()[0].date;
  const prevSold = st.chartWeek.length > 1 ? st.chartWeek[st.chartWeek.length - 2].sold : 0;
  return {
    from: dateKey(addDays(end, -4)),
    to: dateKey(end),
    revenue: w.revenue,
    previous: w.previous,
    revenueChange: w.previous > 0 ? (w.revenue - w.previous) / w.previous : 0,
    sold: w.sold,
    soldPrevious: prevSold,
    satisfaction: w.satisfaction,
    orders: w.sold + w.cancelled,
    cancelled: w.cancelled,
    subscriptions: st.subscriptions,
    top: sorted[0],
    flop: sorted[sorted.length - 1],
    purchases: spentOf(purchases),
    purchaseCount: purchases.length,
    lossValue: st.lossValue,
    lossPct: st.lossPct,
    lowStocks: ingredients.filter((i) => i.stock < i.threshold),
    credit: st.creditTotal,
    creditStudents: st.creditStudents,
    creditMeals: st.creditMeals,
    creditFees: st.creditFees,
    lowAlerts: st.lowAlerts,
    issues: issues.length,
    issuesOpen: issues.filter((i) => i.status === 'open').length,
    refunds: st.refunds,
    unconfirmed: Math.max(0, st.pickupsToday - st.pickupsDone),
    forecastDishes: st.forecastDishes,
    forecastRevenue: st.forecastWeekRevenue,
    needs: st.needs,
    budget: st.budgetNext,
  };
}

/** Classeur Excel détaillé (6 feuilles) puis téléchargement (web) ou partage (téléphone). Renvoie le nom du fichier. */
export async function exportWeekReport(catalog: Dish[], ingredients: Ingredient[], purchases: Purchase[], issues: Issue[]): Promise<string> {
  const f = weekFigures(catalog, ingredients, purchases, issues);
  const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} %`;
  const wb = XLSX.utils.book_new();

  const summary = [
    ['Cantine de Vatel — Rapport d’activité', ''],
    ['Période', `du ${f.from} au ${f.to}`],
    [],
    ['ÉVOLUTION', ''],
    ['Recettes de la semaine (F)', f.revenue],
    ['Recettes semaine précédente (F)', f.previous],
    ['Évolution des recettes', pct(f.revenueChange)],
    ['Plats vendus', f.sold],
    ['Plats vendus semaine précédente', f.soldPrevious],
    ['Évolution des plats vendus', f.soldPrevious > 0 ? pct((f.sold - f.soldPrevious) / f.soldPrevious) : '—'],
    ['Satisfaction (% de 👍)', `${f.satisfaction} %`],
    [],
    ['VENTES', ''],
    ['Commandes passées', f.orders],
    ['Commandes annulées', f.cancelled],
    ['Abonnés à l’offre annuelle', f.subscriptions],
    [],
    ['PLATS', ''],
    ['Plat le plus aimé', f.top ? `${f.top.fr} (${f.top.likes} %)` : '—'],
    ['Plat le moins aimé', f.flop ? `${f.flop.fr} (${f.flop.likes} %)` : '—'],
    [],
    ['STOCK', ''],
    ['Achats de la semaine (F)', f.purchases],
    ['Nombre d’achats', f.purchaseCount],
    ['Sorties de stock (consommation)', useAdmin.getState().usages.length],
    ['Pertes estimées (F)', f.lossValue],
    ['Écart de stock', `${f.lossPct} %`],
    ['Ingrédients sous le seuil', f.lowStocks.map((i) => i.fr).join(', ') || 'aucun'],
    [],
    ['CRÉDITS', ''],
    ['Crédits en cours (F)', f.credit],
    ['Élèves concernés', f.creditStudents],
    ['Plats pris à crédit', f.creditMeals],
    ['Frais de dépannage encaissés (F)', f.creditFees],
    ['Alertes de solde bas envoyées', f.lowAlerts],
    [],
    ['INCIDENTS', ''],
    ['Signalements « plat non reçu »', f.issues],
    ['Signalements en attente', f.issuesOpen],
    ['Remboursements', f.refunds],
    ['Retraits non confirmés', f.unconfirmed],
    [],
    ['SEMAINE PROCHAINE', ''],
    ['Plats à préparer demain', f.forecastDishes],
    ['Recettes prévues (F)', f.forecastRevenue],
    ['Budget d’achats estimé (F)', f.budget],
  ];
  const s1 = XLSX.utils.aoa_to_sheet(summary);
  s1['!cols'] = [{ wch: 38 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, s1, 'Résumé');

  const days = useAdmin.getState().stats.chartDay.map((d) => ({ Jour: d.d, 'Recettes (F)': d.revenue, 'Plats vendus': d.sold }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(days.length ? days : [{ Jour: '', 'Recettes (F)': 0 }]), 'Ventes par jour');

  const ingNames = new Map(ingredients.map((i) => [i.id, i]));
  const needs = f.needs.map((n) => ({ Ingrédient: ingNames.get(n.id)?.fr ?? n.id, 'Besoin semaine': n.need, 'En stock': n.stock, 'À acheter': n.toBuy, 'Coût estimé (F)': n.cost }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(needs.length ? needs : [{ Ingrédient: 'Aucun achat à prévoir' }]), 'Prévisions d’achat');

  const dishes = [...catalog]
    .sort((a, b) => b.likes - a.likes)
    .map((d) => ({ Plat: d.fr, Catégorie: d.cat, 'Prix (F)': d.price, '👍 (%)': d.likes, Votes: d.votes }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dishes), 'Plats');

  const buys = purchases.map((p) => ({
    Date: dateKey(new Date(p.at)),
    Produit: p.name,
    Quantité: p.qty,
    Unité: p.unit,
    'Montant (F)': p.amount,
    Fournisseur: p.supplier,
    'Utilisé pour': p.usedFor.map((id) => catalog.find((d) => d.id === id)?.fr ?? id).join(', '),
    Remarque: p.note,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buys.length ? buys : [{ Date: '', Produit: 'Aucun achat' }]), 'Achats');

  const usages: Usage[] = useAdmin.getState().usages;
  const used = usages.map((u) => ({
    Date: dateKey(new Date(u.at)),
    Produit: u.name,
    'Quantité utilisée': u.qty,
    Unité: u.unit,
    'Utilisé pour': u.usedFor.map((id) => catalog.find((d) => d.id === id)?.fr ?? id).join(', '),
    Remarque: u.note,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(used.length ? used : [{ Date: '', Produit: 'Aucune consommation' }]), 'Consommation');

  const stock = ingredients.map((i) => ({
    Ingrédient: i.fr,
    Stock: i.stock,
    Unité: i.unit,
    Seuil: i.threshold,
    'Valeur (F)': i.stock * i.price,
    Statut: i.stock < i.threshold ? 'Sous le seuil' : 'OK',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stock), 'Stocks');

  const inc = issues.map((i) => ({ Élève: i.student, Plat: catalog.find((d) => d.id === i.dishId)?.fr ?? i.dishId, Statut: i.status }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inc.length ? inc : [{ Élève: '', Plat: 'Aucun signalement' }]), 'Signalements');

  const name = `rapport-cantine-${f.to}.xlsx`;
  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, name);
    return name;
  }
  const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
  const file = new File(Paths.cache, name);
  (file as any).write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: name,
  });
  return name;
}
