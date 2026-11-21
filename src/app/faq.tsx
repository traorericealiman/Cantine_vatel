import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Card, T } from '../components/ui';
import { FAQ, PARENT_FAQ } from '../lib/data';
import { fill } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useApp, useI18n } from '../store/app';

export default function Faq() {
  const { t, lang } = useI18n();
  const role = useApp((s) => s.role);
  const items = role === 'parent' ? PARENT_FAQ : FAQ;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Stack.Screen options={{ title: t('faq') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {items.map((item, i) => {
          const on = open === i;
          return (
            <Card key={i} padded={false} style={{ marginBottom: 12 }}>
              <Pressable onPress={() => setOpen(on ? null : i)} style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T v="headline" style={{ flex: 1, paddingRight: 12 }}>
                    {item.q[lang]}
                  </T>
                  <T v="title2" color={colors.brandText}>
                    {on ? '–' : '+'}
                  </T>
                </View>
                {on ? (
                  <T v="callout" color={colors.muted} style={{ marginTop: 10 }}>
                    {fill(lang, item.a[lang])}
                  </T>
                ) : null}
              </Pressable>
            </Card>
          );
        })}
      </ScrollView>
    </>
  );
}
