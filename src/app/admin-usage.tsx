import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Field, T, KeyboardRoot } from '../components/ui';
import { dishName } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Ajout d'une consommation : ce que la cuisine a utilisé, en quelle quantité et pour quels plats. Le stock baisse. */
export default function AdminUsage() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const ingredients = useAdmin((s) => s.ingredients);
  const catalog = useAdmin((s) => s.catalog);
  const add = useAdmin((s) => s.addUsage);

  const [ingredientId, setIngredientId] = useState<string | undefined>(ingredients[0]?.id);
  const [other, setOther] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(ingredients[0]?.unit ?? 'kg');
  const [usedFor, setUsedFor] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const ing = ingredients.find((i) => i.id === ingredientId);
  const name = ing ? (lang === 'fr' ? ing.fr : ing.en) : other.trim();
  const q = parseFloat(qty.replace(',', '.')) || 0;
  const valid = name.length > 1 && q > 0;

  const pick = (id?: string) => {
    setIngredientId(id);
    const i = ingredients.find((x) => x.id === id);
    if (i) setUnit(i.unit);
  };

  const save = () => {
    if (!valid) return;
    add({ ingredientId, name, qty: q, unit: unit.trim() || 'kg', usedFor, note: note.trim() });
    router.back();
  };

  return (
    <KeyboardRoot>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <T v="title2">{t('aAddUsage')}</T>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T v="body" weight="600" color={colors.brandText}>
              {t('close')}
            </T>
          </Pressable>
        </View>
        <T v="subhead" color={colors.muted} style={{ marginBottom: 18 }}>
          {t('aUsageHint')}
        </T>

        <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
          {t('aProduct')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {ingredients.map((i) => (
            <Chip
              key={i.id}
              label={`${lang === 'fr' ? i.fr : i.en} · ${i.stock} ${i.unit}`}
              selected={ingredientId === i.id}
              onPress={() => pick(i.id)}
            />
          ))}
          <Chip label={t('aOther')} selected={!ingredientId} onPress={() => pick(undefined)} />
        </View>
        {!ingredientId ? <Field label={t('aProductName')} value={other} onChangeText={setOther} placeholder="Gingembre" /> : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('aUsedQty')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="12" />
          </View>
          <View style={{ width: 110 }}>
            <Field label={t('aUnit')} value={unit} onChangeText={setUnit} placeholder="kg" />
          </View>
        </View>

        <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
          {t('aUsedFor')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {catalog.map((d) => (
            <Chip
              key={d.id}
              label={dishName(d, lang)}
              selected={usedFor.includes(d.id)}
              onPress={() => setUsedFor((l) => (l.includes(d.id) ? l.filter((x) => x !== d.id) : [...l, d.id]))}
            />
          ))}
        </View>

        <Field label={t('aNote')} value={note} onChangeText={setNote} placeholder="2 kg abîmés jetés" multiline />
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button label={t('aSaveUsage')} disabled={!valid} onPress={save} />
      </View>
    </KeyboardRoot>
  );
}
