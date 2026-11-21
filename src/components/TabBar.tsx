import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from './fx';
import { HeartIcon } from './icons';
import { T } from './ui';
import { colors } from '../lib/theme';
import { Key } from '../lib/i18n';
import { useI18n } from '../store/app';

/**
 * Barre flottante commune aux espaces élève, parent et admin : du texte, une pastille bleu nuit qui glisse sous l'onglet
 * actif, et en option un seul bouton rond mis en avant (`center`).
 * `hrefFor` donne l'adresse de chaque onglet ; la navigation passe par `router.navigate` (pas par `navigation`).
 */
export function TabBar({
  state,
  labels,
  hrefFor,
  center,
}: {
  state: any;
  labels: Record<string, Key>;
  hrefFor: (route: string) => string;
  center?: string;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const count: number = state.routes.length;
  const onCenter = !!center && state.routes[state.index]?.name === center;
  const [slide] = useState(() => new Animated.Value(state.index));
  const [fade] = useState(() => new Animated.Value(onCenter ? 0 : 1));
  const [width, setWidth] = useState(0);
  const tab = width / Math.max(1, count);

  useEffect(() => {
    Animated.spring(slide, { toValue: state.index, speed: 16, bounciness: 6, useNativeDriver: true }).start();
    Animated.timing(fade, { toValue: onCenter ? 0 : 1, duration: 160, useNativeDriver: true }).start();
  }, [slide, fade, state.index, onCenter]);

  const translateX = count > 1 ? slide.interpolate({ inputRange: [0, count - 1], outputRange: [0, tab * (count - 1)] }) : 0;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 4 }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - 14)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 66,
          paddingHorizontal: 6,
          borderRadius: 33,
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: '#0F172A',
          shadowOpacity: 0.2,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 14 },
          elevation: 14,
        }}
      >
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 6,
              top: 8,
              bottom: 8,
              width: tab,
              borderRadius: 25,
              backgroundColor: colors.brand,
              opacity: fade,
              transform: [{ translateX }],
            }}
          />
        ) : null}
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const go = () => {
            if (!focused) router.navigate(hrefFor(route.name) as any);
          };
          if (center && route.name === center) {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
                <Tap onPress={go} scale={0.88} style={{ marginTop: -28 }}>
                  <LinearGradient
                    colors={['#334155', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 4,
                      borderColor: colors.bg,
                      shadowColor: colors.brand,
                      shadowOpacity: 0.45,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 10 },
                      elevation: 10,
                    }}
                  >
                    <HeartIcon filled={focused} size={25} color={colors.white} />
                  </LinearGradient>
                </Tap>
              </View>
            );
          }
          return (
            <Tap key={route.key} onPress={go} scale={0.94} style={{ flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' }}>
              <T v="footnote" weight={focused ? '700' : '500'} numberOfLines={1} color={focused ? colors.onBrand : colors.subtle} style={{ fontSize: 13, lineHeight: 18 }}>
                {t(labels[route.name] ?? 'tabHome')}
              </T>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
