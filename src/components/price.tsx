import { View } from 'react-native';
import { T } from './ui';
import { money } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

/** Réduction (en %) de l'offre en cours de l'élève connecté ; 0 sans offre. */
export function useDiscountPct(): number {
  return useApp((s) => (s.uid ? (s.subscriptions[s.uid]?.pct ?? 0) : 0));
}

/** Nombre de 👍 et de 👎 d'un plat. Rien tant que le plat n'a aucun avis. */
export function Thumbs({ up, down, color = colors.muted }: { up?: number; down?: number; color?: string }) {
  if (up === undefined || down === undefined || up + down === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <T v="footnote" weight="700" color={color}>👍 {up}</T>
      <T v="footnote" weight="700" color={color}>👎 {down}</T>
    </View>
  );
}

/** Nombre de plats encore disponibles. Rien sans quantité saisie par la cuisine, ni quand le plat est complet. */
export function Availability({ left, color }: { left: number | null; color?: string }) {
  const { t } = useI18n();
  if (left === null || left <= 0) return null;
  return (
    <T v="caption" weight="700" color={color ?? (left <= 3 ? colors.warm : colors.muted)} style={{ marginTop: 2 }}>
      {t(left === 1 ? 'availableOne' : 'availableMany', { n: left })}
    </T>
  );
}

/**
 * Prix d'un plat ou d'une opération : si une réduction a été appliquée, le prix du catalogue est barré
 * et le prix réduit s'affiche à côté.
 */
export function Price({
  amount,
  list,
  v = 'headline',
  color,
  strikeColor,
}: {
  amount: number;
  /** Prix avant réduction (affiché barré quand il est plus grand que `amount`). */
  list?: number;
  v?: 'headline' | 'title2' | 'body' | 'subhead' | 'footnote';
  color?: string;
  strikeColor?: string;
}) {
  const reduced = list !== undefined && list > amount;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      {reduced ? (
        <T v={v === 'title2' ? 'callout' : 'footnote'} color={strikeColor ?? colors.muted} style={{ textDecorationLine: 'line-through' }}>
          {money(list!)}
        </T>
      ) : null}
      <T v={v} color={color ?? (reduced ? colors.green : undefined)}>
        {money(amount)}
      </T>
    </View>
  );
}
