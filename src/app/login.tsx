import { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Reveal, Tap } from '../components/fx';
import { EyeIcon } from '../components/icons';
import { LangPill, T } from '../components/ui';
import { dishImages } from '../lib/images';
import { colors, font, noOutline } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

/** Champ sombre et translucide, adapté au fond bleu nuit. */
function DarkInput({
  value,
  onChangeText,
  placeholder,
  secure,
  onSubmit,
  autoCapitalize = 'none',
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  onSubmit?: () => void;
  autoCapitalize?: 'none' | 'characters';
}) {
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 58,
        borderRadius: 16,
        paddingHorizontal: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: focus ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)',
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        secureTextEntry={secure && hidden}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? 'go' : 'next'}
        style={{ flex: 1, fontSize: 16, color: colors.white, ...font('500'), ...noOutline }}
      />
      {secure ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <EyeIcon off={!hidden} size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Connexion : photo en haut qui se fond dans le bleu nuit, puis un formulaire épuré (matricule + mot de passe). */
export default function Login() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const login = useApp((s) => s.login);
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    let r: 'ok' | 'first' | 'empty' | 'wrong' | 'error' = 'error';
    try {
      r = await login(matricule, password);
    } catch {}
    setBusy(false);
    if (r === 'empty') return setError(t('loginEmpty'));
    if (r === 'wrong') return setError(t('loginError'));
    if (r === 'error') return setError(t('loginFailed'));
    setError(null);
    const role = useApp.getState().role;
    router.replace((r === 'first' ? '/first-login' : role === 'admin' ? '/(admin)/dashboard' : role === 'parent' ? '/(parent)/overview' : '/(tabs)') as any);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.night }} behavior="padding">
      <StatusBar style="light" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '48%' }}>
        <Image source={dishImages.tcheb} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        <LinearGradient
          colors={['rgba(11,18,34,0.35)', 'rgba(11,18,34,0.15)', 'rgba(11,18,34,0.85)', colors.night]}
          locations={[0, 0.35, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 8, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end' }}>
          <LangPill />
        </View>

        <View style={{ flex: 1, minHeight: 230 }} />

        <Reveal>
          <T color={colors.white} align="center" style={{ fontSize: 30, lineHeight: 36, letterSpacing: -0.6, ...font('700') }}>
            {t('loginTitle')}
          </T>
          <T v="subhead" color="rgba(255,255,255,0.65)" align="center" style={{ marginTop: 6, marginBottom: 28 }}>
            {t('loginSub')}
          </T>
        </Reveal>

        <Reveal delay={120} style={{ gap: 12 }}>
          <DarkInput value={matricule} onChangeText={setMatricule} placeholder={t('matriculePh')} autoCapitalize="characters" />
          <DarkInput value={password} onChangeText={setPassword} placeholder={t('passwordPh')} secure onSubmit={submit} />
          {error ? (
            <T v="footnote" color="#F87171" style={{ marginLeft: 4 }}>
              {error}
            </T>
          ) : null}
        </Reveal>

        <Reveal delay={220} style={{ marginTop: 20 }}>
          <Tap
            onPress={submit}
            scale={0.97}
            style={{ height: 58, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
          >
            <T v="headline" color={colors.night}>
              {t('signIn')}
            </T>
          </Tap>
          <Pressable onPress={() => setForgot((f) => !f)} style={{ alignItems: 'center', paddingVertical: 18 }}>
            <T v="subhead" weight="600" color="rgba(255,255,255,0.85)">
              {t('forgot')}
            </T>
          </Pressable>
          {forgot ? (
            <T v="footnote" color="rgba(255,255,255,0.6)" align="center" style={{ marginBottom: 8 }}>
              {t('forgotInfo')}
            </T>
          ) : null}
        </Reveal>


        <T v="caption" color="rgba(255,255,255,0.45)" align="center" style={{ marginTop: 18, paddingHorizontal: 12 }}>
          {t('loginTerms')}
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
