import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Field, T, KeyboardRoot } from '../components/ui';
import { dishName } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Ajout d'un achat : quoi, combien, pour combien, chez qui, et pour quels plats. */
export default function AdminPurchase() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const ingredients = useAdmin((s) => s.ingredients);
  const catalog = useAdmin((s) => s.catalog);
  const add = useAdmin((s) => s.addPurchase);

  const [ingredientId, setIngredientId] = useState<string | undefined>(ingredients[0]?.id);
  const [other, setOther] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(ingredients[0]?.unit ?? 'kg');
  const [amount, setAmount] = useState('');
  const [supplier, setSupplier] = useState('');
  const [usedFor, setUsedFor] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const ing = ingredients.find((i) => i.id === ingredientId);
  const name = ing ? (lang === 'fr' ? ing.fr : ing.en) : other.trim();
  const q = parseFloat(qty.replace(',', '.')) || 0;
  const a = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const valid = name.length > 1 && q > 0 && a > 0;

  const pick = (id?: string) => {
    setIngredientId(id);
    const i = ingredients.find((x) => x.id === id);
    if (i) setUnit(i.unit);
  };

  const save = () => {
    if (!valid) return;
    add({ ingredientId, name, qty: q, unit: unit.trim() || 'kg', amount: a, supplier: supplier.trim(), usedFor, note: note.trim() });
    router.back();
  };

  const label = (k: Parameters<typeof t>[0]) => (
    <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
      {t(k)}
    </T>
  );

  return (
    <KeyboardRoot>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <T v="title2">{t('aAddPurchase')}</T>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T v="body" weight="600" color={colors.brandText}>
              {t('close')}
            </T>
          </Pressable>
        </View>

        {label('aProduct')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {ingredients.map((i) => (
            <Chip key={i.id} label={lang === 'fr' ? i.fr : i.en} selected={ingredientId === i.id} onPress={() => pick(i.id)} />
          ))}
          <Chip label={t('aOther')} selected={!ingredientId} onPress={() => pick(undefined)} />
        </View>
        {!ingredientId ? <Field label={t('aProductName')} value={other} onChangeText={setOther} placeholder="Gingembre" /> : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('aQty')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="20" />
          </View>
          <View style={{ width: 110 }}>
            <Field label={t('aUnit')} value={unit} onChangeText={setUnit} placeholder="kg" />
          </View>
        </View>
        <Field label={t('aAmount')} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="14000" />
        <Field label={t('aSupplier')} value={supplier} onChangeText={setSupplier} placeholder="Marché d’Adjamé" />

        {label('aUsedFor')}
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

        <Field label={t('aNote')} value={note} onChangeText={setNote} multiline />
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button label={t('aSavePurchase')} disabled={!valid} onPress={save} />
      </View>
    </KeyboardRoot>
  );
}
