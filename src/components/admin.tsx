import { ReactNode } from 'react';
import { View } from 'react-native';
import { Reveal } from './fx';
import { ProfileButton, BellButton } from './notifications';
import { LangPill, T } from './ui';
import { compact } from '../lib/format';
import { colors, radius, shadow } from '../lib/theme';

/** En-tête des écrans admin : titre, sous-titre, langue et accès au compte. */
export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 4 : 18 }}>
        <T v="title" numberOfLines={1} style={{ flex: 1, paddingRight: 10, fontSize: 25, lineHeight: 31 }}>
          {title}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LangPill />
          <BellButton />
          <ProfileButton />
        </View>
      </View>
      {subtitle ? (
        <T v="subhead" color={colors.muted} style={{ marginBottom: 18 }}>
          {subtitle}
        </T>
      ) : null}
    </Reveal>
  );
}

/** Petite carte d'indicateur : libellé, grande valeur, ligne de détail. */
export function StatCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'green' | 'warm' | 'red' }) {
  const color = tone === 'green' ? colors.green : tone === 'warm' ? colors.warm : tone === 'red' ? colors.red : colors.muted;
  return (
    <View
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 16,
        ...shadow,
      }}
    >
      <T v="footnote" color={colors.muted}>
        {label}
      </T>
      <T style={{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 6 }}>{value}</T>
      {detail ? (
        <T v="caption" weight="600" color={color} style={{ marginTop: 4 }}>
          {detail}
        </T>
      ) : null}
    </View>
  );
}

/** Graphique en barres simple, sans bibliothèque : la dernière barre (période en cours) est en bleu nuit. */
export function BarChart({ data, unit = 'money' }: { data: { label: string; value: number }[]; unit?: 'money' | 'count' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 170, paddingTop: 22 }}>
      {data.map((d, i) => {
        const last = i === data.length - 1;
        return (
          <View key={d.label + i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <T v="caption" weight="600" numberOfLines={1} color={last ? colors.text : colors.muted} style={{ fontSize: 11, lineHeight: 15, marginBottom: 4 }}>
              {unit === 'money' ? compact(d.value) : d.value.toLocaleString('fr-FR')}
            </T>
            <View
              style={{
                width: '100%',
                maxWidth: 38,
                height: `${Math.max(6, (d.value / max) * 100) * 0.82}%`,
                borderRadius: 10,
                backgroundColor: last ? colors.brand : '#E2E8F0',
              }}
            />
            <T v="caption" numberOfLines={1} color={colors.muted} style={{ fontSize: 12, lineHeight: 16, marginTop: 6 }}>
              {d.label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

/** Barre de progression fine. */
export function Progress({ value, tone = colors.brand }: { value: number; tone?: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: tone }} />
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <T v="title2">{title}</T>
        {right}
      </View>
      {children}
    </View>
  );
}
