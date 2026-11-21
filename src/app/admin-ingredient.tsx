import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DONE_BAR_ID, DoneBar } from '../components/pay';
import { Button, Chip, Field, T } from '../components/ui';
import { dishName } from '../lib/i18n';
import { colors, font, noOutline, radius } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Création ou modification d'un ingrédient : nom, unité, prix, seuil d'alerte, stock de départ et recette (quantité par portion). */
export default function AdminIngredient() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAdmin((s) => s.ingredients.find((i) => i.id === id));
  const catalog = useAdmin((s) => s.catalog);
  const save = useAdmin((s) => s.saveIngredient);
  const loadRecipe = useAdmin((s) => s.loadRecipe);
  const remove = useAdmin((s) => s.deleteIngredient);
  const [askRemove, setAskRemove] = useState(false);

  const [fr, setFr] = useState(existing?.fr ?? '');
  const [en, setEn] = useState(existing?.en ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? 'kg');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [threshold, setThreshold] = useState(existing ? String(existing.threshold) : '');
  const [stock, setStock] = useState('0');
  const [recipe, setRecipe] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Recette déjà enregistrée (modification)
  useEffect(() => {
    if (!id) return;
    loadRecipe(id).then((r) => setRecipe(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))));
  }, [id, loadRecipe]);

  const decimal = (v: string) => v.replace(',', '.').replace(/[^\d.]/g, '');
  const priceN = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const thresholdN = parseFloat(decimal(threshold)) || 0;
  const valid = fr.trim().length > 1 && unit.trim().length > 0 && priceN > 0 && thresholdN > 0;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    await save({
      id: existing?.id,
      fr: fr.trim(),
      en: en.trim() || fr.trim(),
      unit: unit.trim(),
      price: priceN,
      threshold: thresholdN,
      stock: parseFloat(decimal(stock)) || 0,
      recipe: Object.entries(recipe)
        .map(([dishId, q]) => ({ dishId, qty: parseFloat(decimal(q)) || 0 }))
        .filter((r) => r.qty > 0),
    });
    router.back();
  };

  const toggle = (dishId: string) =>
    setRecipe((r) => {
      const next = { ...r };
      if (dishId in next) delete next[dishId];
      else next[dishId] = '';
      return next;
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <T v="title2">{existing ? t('aEditIngredient') : t('aAddIngredient')}</T>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T v="body" weight="600" color={colors.brandText}>
              {t('close')}
            </T>
          </Pressable>
        </View>

        <Field label={t('aIngredientName')} value={fr} onChangeText={setFr} placeholder="Gingembre" />
        <Field label={t('aDishNameEn')} value={en} onChangeText={setEn} placeholder="Ginger" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('aUnit')} value={unit} onChangeText={setUnit} placeholder="kg" />
          </View>
          <View style={{ flex: 1.4 }}>
            <Field label={t('aPricePerUnit')} value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="1200" inputAccessoryViewID={DONE_BAR_ID} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('aThresholdLabel')} value={threshold} onChangeText={(v) => setThreshold(decimal(v))} keyboardType="decimal-pad" placeholder="20" inputAccessoryViewID={DONE_BAR_ID} />
          </View>
          {!existing ? (
            <View style={{ flex: 1 }}>
              <Field label={t('aInitialStock')} value={stock} onChangeText={(v) => setStock(decimal(v))} keyboardType="decimal-pad" placeholder="0" inputAccessoryViewID={DONE_BAR_ID} />
            </View>
          ) : null}
        </View>

        <T v="headline" style={{ marginTop: 8 }}>
          {t('aRecipe')}
        </T>
        <T v="footnote" color={colors.muted} style={{ marginTop: 2, marginBottom: 12 }}>
          {t('aRecipeHint')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {catalog.map((d) => (
            <Chip key={d.id} label={dishName(d, lang)} selected={d.id in recipe} onPress={() => toggle(d.id)} />
          ))}
        </View>

        {catalog
          .filter((d) => d.id in recipe)
          .map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 }}>
              <T v="body" style={{ flex: 1 }} numberOfLines={1}>
                {dishName(d, lang)}
              </T>
              <TextInput
                value={recipe[d.id]}
                onChangeText={(v) => setRecipe((r) => ({ ...r, [d.id]: decimal(v) }))}
                placeholder="0.15"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                inputAccessoryViewID={DONE_BAR_ID}
                style={{ width: 80, paddingVertical: 12, textAlign: 'right', fontSize: 16, color: colors.text, ...font('500'), ...noOutline }}
              />
              <T v="footnote" color={colors.muted} style={{ marginLeft: 6 }}>
                {unit || '…'} / {t('aPerPortion')}
              </T>
            </View>
          ))}

        {existing ? (
          askRemove ? (
            <View style={{ marginTop: 28, padding: 16, borderRadius: 16, backgroundColor: colors.redSoft }}>
              <T v="subhead" color={colors.red}>
                {t('aDeleteIngredientAsk')}
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button label={t('aKeep')} kind="soft" style={{ flex: 1 }} onPress={() => setAskRemove(false)} />
                <Button
                  label={t('aDeleteConfirm')}
                  kind="danger"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    await remove(existing.id);
                    router.back();
                  }}
                />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAskRemove(true)} style={{ marginTop: 28, alignItems: 'center', paddingVertical: 12 }}>
              <T v="subhead" weight="600" color={colors.red}>
                {t('aDeleteIngredient')}
              </T>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
        <Button label={t('aSaveIngredient')} disabled={!valid || busy} onPress={submit} />
      </View>
      <DoneBar />
    </KeyboardAvoidingView>
  );
}
