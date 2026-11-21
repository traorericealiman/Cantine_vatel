import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Field, Segmented, T, KeyboardRoot } from '../components/ui';
import { ALLERGENS, Allergen, Cat } from '../lib/data';
import { allergenName } from '../lib/i18n';
import { colors } from '../lib/theme';
import { uploadDishImage, useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Formulaire d'enregistrement d'un nouveau plat dans le catalogue. */
export default function AdminDishNew() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAdmin((s) => s.catalog.find((d) => d.id === id));
  const addDish = useAdmin((s) => s.addDish);
  const updateDish = useAdmin((s) => s.updateDish);
  const archiveDish = useAdmin((s) => s.archiveDish);
  const [fr, setFr] = useState(existing?.fr ?? '');
  const [en, setEn] = useState(existing?.en ?? '');
  const [cat, setCat] = useState<Cat>(existing?.cat ?? 'main');
  const [price, setPrice] = useState(existing ? String(existing.price) : '1000');
  const [comps, setComps] = useState(existing ? existing.components.map((c) => c.fr).join(', ') : '');
  const [removable, setRemovable] = useState<string[]>(existing ? existing.components.filter((c) => c.removable).map((c) => c.fr) : []);
  const [allergens, setAllergens] = useState<Allergen[]>(existing?.allergens ?? []);
  const [askRemove, setAskRemove] = useState(false);
  const [image, setImage] = useState<string | undefined>(existing?.image);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoError, setPhotoError] = useState<string | false>(false);

  const parts = comps
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const amount = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const valid = fr.trim().length > 1 && amount > 0 && parts.length > 0;

  // Choix d'une photo dans la galerie, envoyée tout de suite dans Supabase Storage.
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [4, 3], exif: false, base64: true });
    if (r.canceled || !r.assets[0]) return;
    setUploading(true);
    setPhotoError(false);
    const res = await uploadDishImage(r.assets[0].uri, r.assets[0].mimeType, r.assets[0].base64);
    setUploading(false);
    if (res.url) setImage(res.url);
    else setPhotoError(res.error ?? 'Erreur inconnue');
  };

  const save = async () => {
    if (!valid || saving || uploading) return;
    const dish = {
      fr: fr.trim(),
      en: en.trim() || fr.trim(),
      cat,
      price: amount,
      emoji: existing?.emoji ?? '🍽️',
      image,
      components: parts.map((p) => {
        const old = existing?.components.find((c) => c.fr === p);
        return { id: old?.id ?? slug(p), fr: p, en: old?.en ?? p, removable: removable.includes(p) };
      }),
      allergens,
      custom: removable.length > 0,
    };
    setSaving(true);
    setSaveError('');
    const res = existing ? await updateDish(existing.id, dish) : await addDish(dish);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    router.back();
  };

  return (
    <KeyboardRoot>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <T v="title2">{existing ? t('aEditDish') : t('aAddDish')}</T>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T v="body" weight="600" color={colors.brandText}>
              {t('close')}
            </T>
          </Pressable>
        </View>

        <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 6, marginLeft: 4 }}>
          {t('aPhoto')}
        </T>
        <Pressable
          onPress={pickPhoto}
          style={{ height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}
        >
          {uploading ? (
            <ActivityIndicator />
          ) : image ? (
            <Image source={{ uri: image }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <T v="subhead" weight="600" color={colors.brandText}>
              {t('aPickPhoto')}
            </T>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginHorizontal: 4 }}>
          {image ? (
            <>
              <Pressable onPress={pickPhoto} hitSlop={8}>
                <T v="footnote" weight="600" color={colors.brandText}>
                  {t('aChangePhoto')}
                </T>
              </Pressable>
              <Pressable onPress={() => setImage(undefined)} hitSlop={8}>
                <T v="footnote" weight="600" color={colors.red}>
                  {t('aRemovePhoto')}
                </T>
              </Pressable>
            </>
          ) : null}
        </View>
        {photoError ? (
          <T v="footnote" color={colors.red} style={{ marginBottom: 10, marginLeft: 4 }}>
            {t('aPhotoError')} ({photoError})
          </T>
        ) : null}

        <Field label={t('aDishName')} value={fr} onChangeText={setFr} placeholder="Kedjenou de poulet" />
        <Field label={t('aDishNameEn')} value={en} onChangeText={setEn} placeholder="Chicken kedjenou" />

        <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 6, marginLeft: 4 }}>
          {t('aCategory')}
        </T>
        <Segmented
          value={cat}
          onChange={setCat}
          options={[
            { key: 'starter', label: t('catStarter') },
            { key: 'main', label: t('catMain') },
            { key: 'dessert', label: t('catDessert') },
          ]}
        />

        <View style={{ height: 14 }} />
        <Field label={t('aPrice')} value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Field label={t('aComponents')} value={comps} onChangeText={setComps} placeholder="Poulet, oignon, piment, tomate" />

        {parts.length ? (
          <>
            <T v="footnote" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
              {t('aRemovableHint')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {parts.map((p) => (
                <Chip key={p} label={p} selected={removable.includes(p)} onPress={() => setRemovable((r) => (r.includes(p) ? r.filter((x) => x !== p) : [...r, p]))} />
              ))}
            </View>
          </>
        ) : null}

        <T v="footnote" weight="500" color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
          {t('aAllergens')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALLERGENS.map((a) => (
            <Chip
              key={a}
              label={allergenName(a, lang)}
              tone="red"
              selected={allergens.includes(a)}
              onPress={() => setAllergens((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))}
            />
          ))}
        </View>

        {existing ? (
          askRemove ? (
            <View style={{ marginTop: 28, padding: 16, borderRadius: 16, backgroundColor: colors.redSoft }}>
              <T v="subhead" color={colors.red}>
                {t('aRemoveDishAsk')}
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button label={t('aKeep')} kind="soft" style={{ flex: 1 }} onPress={() => setAskRemove(false)} />
                <Button
                  label={t('aRemoveConfirm')}
                  kind="danger"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    await archiveDish(existing.id);
                    router.back();
                  }}
                />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAskRemove(true)} style={{ marginTop: 28, alignItems: 'center', paddingVertical: 12 }}>
              <T v="subhead" weight="600" color={colors.red}>
                {t('aRemoveDish')}
              </T>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
        {saveError ? (
          <T v="footnote" color={colors.red} style={{ marginBottom: 8 }}>
            {t('aSaveError')} ({saveError})
          </T>
        ) : null}
        <Button label={saving ? t('aSaving') : uploading ? t('aUploading') : t('aSaveDish')} disabled={!valid || saving || uploading} onPress={save} />
      </View>
    </KeyboardRoot>
  );
}
