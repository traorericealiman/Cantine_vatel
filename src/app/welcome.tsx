import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Reveal, Tap } from '../components/fx';
import { LangPill, T } from '../components/ui';
import { dishImages } from '../lib/images';
import { colors, font } from '../lib/theme';
import { useI18n } from '../store/app';

/** Écran d'accueil plein écran : la photo du Garba en fond, un titre fort et un seul bouton. */
export default function Welcome() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Léger zoom lent sur la photo, pour donner de la vie sans distraire.
  const zoom = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1.08, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [zoom]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.text }}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
        <Image source={dishImages.garba} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
      <LinearGradient
        colors={['rgba(15,23,42,0.55)', 'rgba(15,23,42,0)', 'rgba(15,23,42,0.55)', 'rgba(15,23,42,0.97)']}
        locations={[0, 0.25, 0.55, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 12, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <LangPill />
        </View>

        <View style={{ flex: 1 }} />

        <Reveal delay={150}>
          <T color={colors.white} style={{ fontSize: 46, lineHeight: 50, letterSpacing: -1.2, ...font('700') }}>
            {t('welcomeTitle')}
          </T>
          <T v="body" color="rgba(255,255,255,0.88)" style={{ marginTop: 14, fontSize: 17, lineHeight: 24 }}>
            {t('welcomeSub')}
          </T>
        </Reveal>

        <Reveal delay={350} style={{ marginTop: 32 }}>
          <Tap
            onPress={() => router.push('/login')}
            scale={0.97}
            style={{ height: 60, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
          >
            <T v="headline" color={colors.night} style={{ fontSize: 18 }}>
              {t('welcomeStart')}
            </T>
          </Tap>
        </Reveal>
      </View>
    </View>
  );
}
