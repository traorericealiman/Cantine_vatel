import { View } from 'react-native';
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
 * Barre flottante commune aux espaces élève et parent : du texte, et en option un seul bouton rond mis en avant (`center`).
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
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 68,
          borderRadius: 34,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: '#0F172A',
          shadowOpacity: 0.16,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const go = () => {
            if (!focused) router.navigate(hrefFor(route.name) as any);
          };
          if (center && route.name === center) {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
                <Tap onPress={go} scale={0.9} style={{ marginTop: -26 }}>
                  <LinearGradient
                    colors={['#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 4,
                      borderColor: colors.bg,
                      shadowColor: colors.brand,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 8,
                    }}
                  >
                    <HeartIcon filled={focused} size={24} color={colors.white} />
                  </LinearGradient>
                </Tap>
              </View>
            );
          }
          return (
            <Tap key={route.key} onPress={go} scale={0.92} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
              <T v="footnote" weight={focused ? '700' : '500'} color={focused ? colors.brandText : colors.muted} style={{ fontSize: 14 }}>
                {t(labels[route.name] ?? 'tabHome')}
              </T>
              <View
                style={{
                  width: focused ? 18 : 5,
                  height: 5,
                  borderRadius: 3,
                  marginTop: 5,
                  backgroundColor: focused ? colors.brand : 'transparent',
                }}
              />
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
