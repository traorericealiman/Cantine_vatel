import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Les notifications reçues alors que l'app est ouverte s'affichent aussi en bannière système.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Demande l'autorisation d'envoyer des notifications, puis enregistre le jeton du téléphone pour cet utilisateur.
 * Ne fait rien (sans erreur) sur le web, dans Expo Go sur Android, ou tant que le projet n'a pas d'identifiant EAS :
 * les notifications à distance demandent une version « development build » de l'app.
 */
export async function registerForPush(userId: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  // Expo Go ne reçoit pas les notifications à distance : inutile de demander l'autorisation.
  if (Constants.appOwnership === 'expo') return 'unsupported';
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        // eslint-disable-next-line import/namespace -- l'export existe à l'exécution, le plugin ne le voit pas
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'unsupported';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').upsert({ token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() });
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

/** Au retrait de la session, ce téléphone ne doit plus recevoir les notifications de l'ancien compte. */
export async function unregisterPush() {
  if (Platform.OS === 'web') return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {}
}
