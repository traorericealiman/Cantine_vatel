import { Platform, TextStyle } from 'react-native';

export const colors = {
  brand: '#0F172A',
  brandDark: '#1E293B',
  brandSoft: '#F2F4F8',
  brandTint: '#F8FAFC',
  brandText: '#0F172A',
  onBrand: '#FFFFFF',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#475569',
  subtle: '#334155',
  line: '#EEF1F6',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  red: '#DC2626',
  redSoft: '#FDEEEE',
  warm: '#B45309',
  warmSoft: '#FEF3E2',
  white: '#FFFFFF',
  night: '#0B1222',
};

export const radius = { sm: 12, md: 16, lg: 24, xl: 30, pill: 999 };

/** Relief doux et large : les cartes flottent sur le fond blanc sans contour marqué. */
export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

const webStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Inter, Roboto, sans-serif';

type Weight = '400' | '500' | '600' | '700';

const interByWeight: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

/** iOS: police système (SF Pro). Android: Inter, la plus proche de SF. Web: pile système Apple. */
export function font(weight: Weight): TextStyle {
  if (Platform.OS === 'android') return { fontFamily: interByWeight[weight] };
  if (Platform.OS === 'web') return { fontFamily: webStack, fontWeight: weight };
  return { fontWeight: weight };
}

export type Variant =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

export const variants: Record<Variant, TextStyle> = {
  largeTitle: { fontSize: 36, lineHeight: 42, letterSpacing: -1.1, ...font('700') },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.9, ...font('700') },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.5, ...font('700') },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3, ...font('600') },
  body: { fontSize: 17, lineHeight: 22, ...font('400') },
  callout: { fontSize: 16, lineHeight: 21, ...font('400') },
  subhead: { fontSize: 15, lineHeight: 20, ...font('400') },
  footnote: { fontSize: 14, lineHeight: 19, ...font('400') },
  caption: { fontSize: 13, lineHeight: 17, ...font('500') },
};

/** Supprime le contour de focus du navigateur (version web uniquement). */
export const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any;

/** Police condensée des grands titres (écran d'accueil). */
export const display = { fontFamily: 'BebasNeue_400Regular' } as const;
