/** Montant abrégé pour les graphiques : 468 000 → « 468k », 2 480 000 → « 2,5M ». */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Pourcentage signé : 0.06 → « +6 % ». */
export const signedPct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))} %`;
