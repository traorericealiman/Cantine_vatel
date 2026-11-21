/** Types métier partagés par le store, les écrans et les règles. */

export interface Order {
  id: string;
  dishId: string;
  date: string;
  removed: string[];
  price: number;
  fee: number;
  onCredit: boolean;
  /** Prix du catalogue avant réduction (présent seulement si une offre a été appliquée). */
  listPrice?: number;
  status: 'ordered' | 'received';
  receivedAt?: number;
  syncPending?: boolean;
  vote?: 1 | -1;
  comment?: string;
}

export interface Tx {
  id: string;
  kind: 'topup' | 'order' | 'refund' | 'debt';
  dishId?: string;
  amount: number; // + entrée d'argent, - sortie
  credit?: boolean;
  /** Montant avant réduction d'une offre (négatif pour une commande). */
  listAmount?: number;
  at: number;
}

/** Une ligne de l'historique de notifications de la base (la cloche la lit). */
export interface DbNotif {
  id: string;
  kind: 'turn' | 'proposal' | 'low' | 'credit' | 'payment' | 'refund' | 'resolved' | 'issue' | 'stock_low' | 'comment' | 'auto_order' | 'auto_fail' | 'order' | 'order_cancelled';
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  at: number;
}

/** Favori : `active` = commande automatique, `ask` = « me demander » (proposition à confirmer). */
export interface Rule {
  id: string;
  dishId: string;
  active: boolean;
  ask: boolean;
}

export interface Proposal {
  id: string;
  ruleId: string;
  dishId: string;
  date: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Quote {
  price: number;
  fee: number;
  credit: boolean;
  refused?: 'limit';
}

export type Role = 'student' | 'parent' | 'admin';

/** Tout ce qui appartient au wallet d'un élève : le parent le consulte et le recharge, jamais il ne commande. */
export interface Wallet {
  balance: number;
  debt: number;
  creditCount: number;
  orders: Order[];
  txs: Tx[];
}

export interface Child {
  id: string;
  name: string;
  first: string;
  matricule: string;
}

/** Offre promotionnelle en cours pour un élève. */
export interface ActiveOffer {
  offer: 'week' | 'month' | 'year';
  pct: number;
  endsOn: string;
}
