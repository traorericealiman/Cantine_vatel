import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '../components/fx';
import { T } from '../components/ui';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

/**
 * Scan du QR code unique du comptoir : valide le retrait de tous les plats du jour de l'élève
 * (mis en attente de synchronisation hors connexion) et les compte côté admin.
 */
export default function Scan() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<'ok' | 'bad' | 'none' | null>(null);
  const locked = useRef(false);
  const online = useApp((s) => s.online);

  const validate = async (data: string) => {
    if (locked.current) return;
    locked.current = true;
    const app = useApp.getState();
    // Hors connexion : le scan est gardé et envoyé au retour du réseau (le serveur vérifie alors le code).
    if (!app.online) {
      app.queueScan(data);
      setResult('ok');
      setTimeout(() => router.back(), 1600);
      return;
    }
    const r = await app.scanPickup(data);
    if (r === 'error') {
      // Pas de réseau : le scan est gardé et sera envoyé dès que possible.
      app.setOnline(false);
      app.queueScan(data);
      setResult('ok');
      setTimeout(() => router.back(), 1600);
      return;
    }
    if (typeof r !== 'number') {
      setResult('bad');
      setTimeout(() => {
        locked.current = false;
        setResult(null);
      }, 1800);
      return;
    }
    if (r === 0) {
      // Code valide, mais aucune commande du jour à retirer (les commandes d'autres jours ne se valident pas).
      setResult('none');
      setTimeout(() => {
        locked.current = false;
        setResult(null);
      }, 2200);
      return;
    }
    setResult('ok');
    setTimeout(() => router.back(), 1600);
  };

  const granted = permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {granted && result !== 'ok' ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => validate(data)}
        />
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 12, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T v="body" weight="600" color={colors.white}>
              {t('close')}
            </T>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {result === 'ok' ? (
            <>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <View style={{ width: 38, height: 20, borderLeftWidth: 6, borderBottomWidth: 6, borderColor: colors.white, transform: [{ rotate: '-45deg' }, { translateY: -4 }] }} />
              </View>
              <T v="title" color={colors.white} align="center">
                {t('aScanOk')}
              </T>
              <T v="body" color="rgba(255,255,255,0.88)" align="center" style={{ marginTop: 6 }}>
                {online ? t('aScanOkSub') : t('aScanOffline')}
              </T>
            </>
          ) : (
            <>
              {/* cadre de visée */}
              <View style={{ width: 250, height: 250, borderRadius: 28, borderWidth: 3, borderColor: result === 'bad' || result === 'none' ? '#F87171' : 'rgba(255,255,255,0.9)' }} />
              <T v="title2" color={colors.white} align="center" style={{ marginTop: 28 }}>
                {t('aScanTitle')}
              </T>
              <T v="subhead" color={result === 'bad' || result === 'none' ? '#F87171' : 'rgba(255,255,255,0.75)'} align="center" style={{ marginTop: 6 }}>
                {result === 'bad' ? t('aScanBad') : result === 'none' ? t('aScanNone') : granted ? t('aScanSub') : t('aScanPermission')}
              </T>
              {!granted ? (
                <Tap
                  onPress={requestPermission}
                  scale={0.97}
                  style={{ marginTop: 20, height: 54, paddingHorizontal: 24, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
                >
                  <T v="headline" color={colors.night}>
                    {t('aScanAllow')}
                  </T>
                </Tap>
              ) : null}
            </>
          )}
        </View>

      </View>
    </View>
  );
}
