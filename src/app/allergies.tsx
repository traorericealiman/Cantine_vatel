import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Check, Divider, T, KeyboardRoot } from '../components/ui';
import { ALLERGENS } from '../lib/data';
import { allergenName } from '../lib/i18n';
import { colors, font, noOutline, radius } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

/** Même écran pour la première connexion (onboarding) et pour modifier ses allergies depuis le profil. */
export default function Allergies() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const first = onboarding === '1';
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const allergies = useApp((s) => s.allergies);
  const toggle = useApp((s) => s.toggleAllergy);
  const finish = useApp((s) => s.finishOnboarding);
  const custom = useApp((s) => s.customAllergies);
  const addCustomAllergy = useApp((s) => s.addCustomAllergy);
  const removeCustom = useApp((s) => s.removeCustomAllergy);
  const [text, setText] = useState('');
  const addCustom = () => {
    if (!text.trim()) return;
    addCustomAllergy(text);
    setText('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: !first,
          title: t('allergies'),
          gestureEnabled: !first,
        }}
      />
      <KeyboardRoot>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: first ? insets.top + 28 : 20, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {first ? (
            <View style={{ marginBottom: 24 }}>
              <T v="largeTitle">{t('allergiesOnbTitle')}</T>
              <T v="body" color={colors.muted} style={{ marginTop: 8 }}>
                {t('allergiesOnbSub')}
              </T>
            </View>
          ) : (
            <T v="subhead" color={colors.muted} style={{ marginBottom: 16 }}>
              {t('allergiesHint')}
            </T>
          )}

          <Card padded={false}>
            <View style={{ paddingHorizontal: 16 }}>
              <Check
                plain
                checked={allergies.length === 0 && custom.length === 0}
                label={t('allergyNone')}
                onPress={() => {
                  allergies.slice().forEach((a) => toggle(a));
                  custom.slice().forEach((c) => removeCustom(c));
                }}
              />
            </View>
            {ALLERGENS.map((a) => (
              <View key={a}>
                <Divider />
                <View style={{ paddingHorizontal: 16 }}>
                  <Check plain checked={allergies.includes(a)} label={allergenName(a, lang)} onPress={() => toggle(a)} />
                </View>
              </View>
            ))}
          </Card>

          {/* Allergies saisies librement par l'élève */}
          <T v="footnote" weight="600" color={colors.muted} style={{ marginTop: 24, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('addAllergyTitle')}
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={addCustom}
              placeholder={t('addAllergyPlaceholder')}
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
              style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, paddingVertical: 13, fontSize: 16, color: colors.text, ...font('400'), ...noOutline }}
            />
            <Button label={t('addBtn')} small disabled={!text.trim()} onPress={addCustom} style={{ justifyContent: 'center' }} />
          </View>
          {custom.length > 0 ? (
            <Card padded={false} style={{ marginTop: 14 }}>
              {custom.map((c, i) => (
                <View key={c}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                    <T v="body" style={{ flex: 1 }}>
                      {c}
                    </T>
                    <Pressable onPress={() => removeCustom(c)} hitSlop={8}>
                      <T v="subhead" weight="600" color={colors.red}>
                        {t('removeBtn')}
                      </T>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>

        {first ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
            <Button
              label={t('continue')}
              onPress={() => {
                finish();
                router.replace('/(tabs)');
              }}
            />
          </View>
        ) : null}
      </KeyboardRoot>
    </>
  );
}
