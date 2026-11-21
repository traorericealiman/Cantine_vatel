import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';

/** Apparition douce : le bloc monte et se révèle. */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 560, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

/** Zone tactile qui se comprime puis rebondit, comme sur iOS. */
export function Tap({
  children,
  onPress,
  style,
  disabled,
  scale = 0.96,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scale?: number;
}) {
  const s = useState(() => new Animated.Value(1))[0];
  // Les propriétés de mise en page (flex, largeur…) doivent s'appliquer au conteneur tactile.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const { flex, flexGrow, flexShrink, flexBasis, width, alignSelf, marginTop, marginBottom, marginLeft, marginRight, ...inner } = flat as any;
  const outer = { flex, flexGrow, flexShrink, flexBasis, width, alignSelf, marginTop, marginBottom, marginLeft, marginRight };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={outer}
      onPressIn={() => Animated.spring(s, { toValue: scale, speed: 50, bounciness: 0, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(s, { toValue: 1, speed: 24, bounciness: 10, useNativeDriver: true }).start()}
    >
      <Animated.View style={[inner, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Nombre qui défile jusqu'à sa valeur. */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    const start = Date.now();
    const a = from.current;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = a + (target - a) * eased;
      from.current = val;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return Math.round(v);
}

/** Fond sobre : un simple dégradé bleu très clair qui se fond dans le gris-bleu de l'écran. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}>
      <LinearGradient colors={[colors.card, colors.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}
