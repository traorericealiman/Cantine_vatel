import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { colors } from '../lib/theme';

export default function RootLayout() {
  // Sur iOS on utilise la police système (SF Pro) ; Inter n'est chargée que pour Android.
  // Bebas Neue (police condensée) sert aux grands titres de l'écran d'accueil, sur toutes les plateformes.
  const [loaded] = useFonts(
    Platform.OS === 'android'
      ? { BebasNeue_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }
      : { BebasNeue_400Regular },
  );
  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.brand,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="first-login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(parent)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(admin)" options={{ animation: 'fade' }} />
        <Stack.Screen name="admin-reviews" options={{ headerShown: true }} />
        <Stack.Screen name="admin-report" options={{ headerShown: true }} />
        <Stack.Screen name="admin-inventory" options={{ headerShown: true }} />
        <Stack.Screen name="admin-purchase" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin-usage" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin-qr" options={{ headerShown: true }} />
        <Stack.Screen name="admin-settings" options={{ headerShown: true }} />
        <Stack.Screen name="admin-dishes" options={{ headerShown: true }} />
        <Stack.Screen name="admin-dish-new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin-ingredient" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="parent-recharge" options={{ presentation: 'modal' }} />
        <Stack.Screen name="parent-alerts" options={{ headerShown: true }} />
        <Stack.Screen name="dish/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recharge" options={{ presentation: 'modal' }} />
        <Stack.Screen name="faq" options={{ headerShown: true }} />
        <Stack.Screen name="history" options={{ headerShown: true }} />
        <Stack.Screen name="notifications" options={{ headerShown: true }} />
        <Stack.Screen name="allergies" options={{ headerShown: true }} />
        <Stack.Screen name="feedback" options={{ headerShown: true }} />
        <Stack.Screen name="password" options={{ headerShown: true }} />
      </Stack>
    </>
  );
}
