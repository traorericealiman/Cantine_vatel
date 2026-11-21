import React, { ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, variants, Variant, noOutline } from '../lib/theme';
import { useApp, useI18n } from '../store/app';
import { Backdrop, Tap } from './fx';
import { dishById } from '../lib/data';
import { dishImages } from '../lib/images';

/* ---------- Texte ---------- */

interface TProps {
  v?: Variant;
  color?: string;
  weight?: '400' | '500' | '600' | '700';
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: ReactNode;
}

export function T({ v = 'body', color = colors.text, weight, align, style, numberOfLines, children }: TProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[variants[v], { color, textAlign: align }, weight ? font(weight) : null, style]}
    >
      {children}
    </Text>
  );
}

/* ---------- Écran ---------- */

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  bottomPad?: number;
  topPad?: number;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Défilement qui laisse la place au clavier (iPhone ET Android : avec l'affichage bord à bord d'Android, le clavier
 * ne redimensionne plus l'écran tout seul). Le champ en cours de saisie reste visible.
 */
export function KeyboardScroll(props: ScrollViewProps) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" {...props} style={[{ flex: 1 }, props.style]} />
    </KeyboardAvoidingView>
  );
}

/** Racine d'écran de formulaire avec barre d'action en bas : tout remonte avec le clavier. */
export function KeyboardRoot({ children, background = colors.bg }: { children: ReactNode; background?: string }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: background }} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}

/** `fixedHeader` : le premier enfant reste fixé en haut de l'écran, seul le reste défile. */
export function Screen({ children, scroll = true, bottomPad = 130, topPad = 8, background = colors.bg, style, backdrop = true, fixedHeader = false }: ScreenProps & { backdrop?: boolean; fixedHeader?: boolean }) {
  const insets = useSafeAreaInsets();
  const parts = fixedHeader ? React.Children.toArray(children) : null;
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: background }}>
        {backdrop ? <Backdrop /> : null}
        <View style={[{ flex: 1, paddingTop: insets.top + topPad }, style]}>{children}</View>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: background }} behavior="padding">
      {backdrop ? <Backdrop /> : null}
      {parts ? (
        <View style={{ paddingTop: insets.top + topPad, paddingHorizontal: 20, zIndex: 2 }}>
          {parts[0]}
          {/* Le contenu se fond sous l'entête au lieu d'être coupé net. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: -18, height: 18 }}
          />
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop: parts ? 0 : insets.top + topPad, paddingBottom: bottomPad, paddingHorizontal: 20 }, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {parts ? parts.slice(1) : children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- Langue ---------- */

export function LangPill() {
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.brandSoft,
        borderRadius: radius.pill,
        padding: 3,
      }}
    >
      {(['fr', 'en'] as const).map((l) => {
        const on = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            hitSlop={6}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: on ? colors.brand : 'transparent',
            }}
          >
            <T v="footnote" weight="600" color={on ? colors.onBrand : colors.muted}>
              {l.toUpperCase()}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bouton de langue compact : affiche la langue courante et bascule au toucher. */
export function LangToggle() {
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <Tap
      onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      scale={0.92}
      style={{ height: 44, minWidth: 48, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
    >
      <T v="footnote" weight="700">
        {lang.toUpperCase()}
      </T>
    </Tap>
  );
}

export function Header({ title, subtitle, right = true }: { title: string; subtitle?: string; right?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="largeTitle">{title}</T>
        {subtitle ? (
          <T v="subhead" color={colors.muted} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ? <LangPill /> : null}
    </View>
  );
}

/* ---------- Carte ---------- */

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radius.lg, padding: padded ? 18 : 0, borderWidth: 1, borderColor: colors.line, ...shadow },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------- Bouton ---------- */

type BtnKind = 'primary' | 'soft' | 'ghost' | 'danger' | 'white' | 'dark';

interface BtnProps {
  label: string;
  onPress?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, kind = 'primary', disabled, small, style }: BtnProps) {
  const palette: Record<BtnKind, { bg: string; fg: string }> = {
    primary: { bg: colors.brand, fg: colors.onBrand },
    dark: { bg: colors.card, fg: colors.text },
    soft: { bg: colors.brandSoft, fg: colors.brandText },
    ghost: { bg: 'transparent', fg: colors.brandText },
    danger: { bg: colors.redSoft, fg: colors.red },
    white: { bg: colors.white, fg: colors.text },
  };
  const p = palette[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: p.bg,
          borderRadius: small ? 14 : 20,
          paddingVertical: small ? 11 : 18,
          paddingHorizontal: small ? 16 : 24,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
          ...(kind === 'primary' && !disabled
            ? { shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 }
            : {}),
        },
        style,
      ]}
    >
      <T v={small ? 'subhead' : 'headline'} weight="600" color={p.fg}>
        {label}
      </T>
    </Tap>
  );
}

/* ---------- Champ ---------- */

interface FieldProps extends TextInputProps {
  label: string;
  secure?: boolean;
}

export function Field({ label, secure, style, ...rest }: FieldProps) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 6, marginLeft: 4 }}>
        {label}
      </T>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focus ? colors.card : colors.brandSoft,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: focus ? colors.brand : colors.brandSoft,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          {...rest}
          secureTextEntry={secure && hidden}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor="#64748B"
          style={[
            {
              flex: 1,
              paddingVertical: 15,
              fontSize: 17,
              color: colors.text,
              ...font('400'),
              ...noOutline,
            },
            style,
          ]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <T v="subhead" weight="600" color={colors.brandText}>
              {hidden ? t('show') : t('hide')}
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- Pastille et contrôle segmenté ---------- */

export function Chip({
  label,
  selected,
  onPress,
  tone = 'blue',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'blue' | 'red';
}) {
  const on = tone === 'red' ? colors.red : colors.brand;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.pill,
        backgroundColor: selected ? on : colors.card,
        borderWidth: 1,
        borderColor: selected ? on : colors.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <T v="subhead" weight="600" color={selected ? (tone === 'red' ? colors.onBrand : colors.onBrand) : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  // Contraste net : une pastille bleu nuit glisse sous l'onglet actif, texte blanc dessus.
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const [slide] = useState(() => new Animated.Value(index));
  const [width, setWidth] = useState(0);
  const segment = width / Math.max(1, options.length);
  useEffect(() => {
    Animated.spring(slide, { toValue: index, speed: 18, bounciness: 5, useNativeDriver: true }).start();
  }, [slide, index]);
  const translateX = options.length > 1 ? slide.interpolate({ inputRange: [0, options.length - 1], outputRange: [0, segment * (options.length - 1)] }) : 0;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.brandSoft, borderRadius: radius.pill, padding: 4 }}>
      <View pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ position: 'absolute', top: 4, bottom: 4, left: 4, right: 4 }}>
        {width > 0 ? (
          <Animated.View style={{ width: segment, height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand, transform: [{ translateX }] }} />
        ) : null}
      </View>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: radius.pill,
              alignItems: 'center',
            }}
          >
            <T v="subhead" weight="600" numberOfLines={1} color={on ? colors.onBrand : colors.text}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Case à cocher ---------- */

export function Check({ checked, label, onPress, hint, plain }: { checked: boolean; label: string; onPress: () => void; hint?: string; plain?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: checked ? colors.brand : '#CBD5E1',
          backgroundColor: checked ? colors.brand : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        {checked ? (
          <View
            style={{
              width: 12,
              height: 7,
              borderLeftWidth: 2.5,
              borderBottomWidth: 2.5,
              borderColor: colors.onBrand,
              transform: [{ rotate: '-45deg' }, { translateY: -1 }],
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <T v="body" color={checked || plain ? colors.text : colors.muted} style={checked || plain ? null : { textDecorationLine: 'line-through' }}>
          {label}
        </T>
        {hint ? (
          <T v="footnote" color={colors.muted}>
            {hint}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ---------- Divers ---------- */

export function Tag({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'green' | 'warm' | 'red' }) {
  const p = {
    blue: { bg: colors.brandSoft, fg: colors.brandText },
    green: { bg: colors.greenSoft, fg: colors.green },
    warm: { bg: colors.warmSoft, fg: colors.warm },
    red: { bg: colors.redSoft, fg: colors.red },
  }[tone];
  return (
    <View style={{ backgroundColor: p.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <T v="caption" weight="600" color={p.fg}>
        {label}
      </T>
    </View>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 28, marginBottom: 12 }, style]}>
      <T v="title2">{children}</T>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 16 }} />;
}

/** Vignette du plat : la photo si on en a une, sinon l'emoji sur fond clair. */
/** Photo d'un plat : celle envoyée par l'admin (base), sinon l'image livrée avec l'app. */
function imageSource(id: string) {
  const uri = dishById(id)?.image;
  return uri ? { uri } : dishImages[id];
}

export function DishTile({ emoji, id, size = 56 }: { emoji: string; id?: string; size?: number }) {
  const src = id ? imageSource(id) : undefined;
  const r = size * 0.3;
  if (src) {
    return <Image source={src} resizeMode="cover" style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.brandSoft }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

/** Grande photo d'un plat (cartes et fiche détail). */
export function DishPhoto({ id, emoji, height, radius: r = 16, tint = colors.brandSoft, emojiSize = 48 }: { id: string; emoji: string; height: number; radius?: number; tint?: string; emojiSize?: number }) {
  const src = imageSource(id);
  if (src) return <Image source={src} resizeMode="cover" style={{ width: '100%', height, borderRadius: r, backgroundColor: tint }} />;
  return (
    <View style={{ width: '100%', height, borderRadius: r, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
    </View>
  );
}

export function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 10, backgroundColor: ok ? colors.green : '#CBD5E1' }} />
      <T v="subhead" color={ok ? colors.text : colors.muted}>
        {label}
      </T>
    </View>
  );
}

/** Petit logo de l'assistant : carré bleu avec deux barres blanches, comme dans la référence. */
export function AssistantLogo({ size = 32 }: { size?: number }) {
  const bar = { width: size * 0.13, height: size * 0.4, borderRadius: size * 0.07, backgroundColor: colors.white };
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: size * 0.12,
      }}
    >
      <View style={bar} />
      <View style={[bar, { height: size * 0.28 }]} />
    </View>
  );
}

/* ---------- Réglages (Profil élève et parent) ---------- */

export function SettingsRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: pressed ? colors.brandTint : 'transparent',
      })}
    >
      <T v="body" style={{ flex: 1 }}>
        {label}
      </T>
      {value ? (
        <T v="subhead" color={colors.muted} numberOfLines={1} style={{ maxWidth: '50%', marginRight: 8 }}>
          {value}
        </T>
      ) : null}
      <T v="title2" color="#64748B">
        ›
      </T>
    </Pressable>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <T v="footnote" weight="600" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </T>
      <Card padded={false}>{children}</Card>
    </View>
  );
}
