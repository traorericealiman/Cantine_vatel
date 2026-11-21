import { Platform, TextStyle } from 'react-native';

export const colors = {
  brand: '#0F172A',
  brandDark: '#1E293B',
  brandSoft: '#F1F5F9',
  brandTint: '#F8FAFC',
  brandText: '#0F172A',
  onBrand: '#FFFFFF',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E8ECF2',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  red: '#DC2626',
  redSoft: '#FDEEEE',
  warm: '#B45309',
  warmSoft: '#FEF3E2',
  white: '#FFFFFF',
  night: '#0B1222',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

/** Ombre très légère : la hiérarchie vient surtout des contours fins et de l'espacement. */
export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
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
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: -0.6, ...font('700') },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5, ...font('700') },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, ...font('700') },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, ...font('600') },
  body: { fontSize: 17, lineHeight: 22, ...font('400') },
  callout: { fontSize: 16, lineHeight: 21, ...font('400') },
  subhead: { fontSize: 15, lineHeight: 20, ...font('400') },
  footnote: { fontSize: 13, lineHeight: 18, ...font('400') },
  caption: { fontSize: 12, lineHeight: 16, ...font('500') },
};

/** Supprime le contour de focus du navigateur (version web uniquement). */
export const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any;

/** Police condensée des grands titres (écran d'accueil). */
export const display = { fontFamily: 'BebasNeue_400Regular' } as const;
