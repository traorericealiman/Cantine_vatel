import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { AdminHeader, Progress, Section } from '../../components/admin';
import { Reveal, Tap } from '../../components/fx';
import { Button, Card, DishTile, Screen, Segmented, T, Tag } from '../../components/ui';
import { cutoffLabel, dishById, serviceDays } from '../../lib/data';
import { allergenName, cap, compName, dayNumber, dishName, longDay, shortDay } from '../../lib/i18n';
import { colors, radius } from '../../lib/theme';
import { ALLERGY_COLOR, TABLE_LETTERS, dayRows, useAdmin } from '../../store/admin';
import { useI18n } from '../../store/app';

/**
 * Service du jour : quantités par plat, mode « appel par plat » ou « tables » (l'admin choisit la table de chaque plat).
 * Les retraits ne se cliquent pas : chaque élève scanne le QR code unique du comptoir, ce qui les compte ici.
 */
export default function Service() {
  const { t, lang } = useI18n();
  const mode = useAdmin((s) => s.mode);
  const setMode = useAdmin((s) => s.setMode);
  const called = useAdmin((s) => s.called);
  const served = useAdmin((s) => s.served);
  const tables = useAdmin((s) => s.tables);
  const cancelCall = useAdmin((s) => s.cancelCall);
  // Table choisie mais pas encore validée : elle n'est enregistrée qu'avec l'appel.
  const [pick, setPick] = useState<Record<string, string>>({});
  const call = useAdmin((s) => s.callDish);
  const token = useAdmin((s) => s.qrToken);
  const issues = useAdmin((s) => s.issues);
  const cutoff = useAdmin((s) => s.cutoff);
  const setIssue = useAdmin((s) => s.setIssue);
  const loadQr = useAdmin((s) => s.loadQr);
  const loadService = useAdmin((s) => s.loadService);
  const dayStats = useAdmin((s) => s.dayStats);
  useEffect(() => {
    loadQr();
    loadService();
    // En plus du temps réel (nouvelle commande, retrait), relecture de secours toutes les 5 secondes.
    const timer = setInterval(loadService, 5000);
    return () => clearInterval(timer);
  }, [loadQr, loadService]);

  const day = useAdmin((s) => s.day);
  const setDay = useAdmin((s) => s.setDay);
  const days = useMemo(() => serviceDays(), []);
  const rows = dayRows(day, dayStats).sort((a, b) => b.total - a.total);

  return (
    <Screen topPad={10}>
      <AdminHeader title={t('tabService')} subtitle={t('aServiceFor', { day: longDay(day, lang) })} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {days.map((d) => {
          const on = d.key === day;
          return (
            <Tap key={d.key} onPress={() => setDay(d.key)} scale={0.94}>
              <View style={{ width: 62, paddingVertical: 12, borderRadius: radius.lg, alignItems: 'center', backgroundColor: on ? colors.brand : colors.card, borderWidth: 1, borderColor: on ? colors.brand : colors.line }}>
                <T v="caption" weight="600" color={on ? 'rgba(255,255,255,0.7)' : colors.muted}>
                  {shortDay(d.key, lang)}
                </T>
                <T v="title2" color={on ? colors.onBrand : colors.text} style={{ marginTop: 2 }}>
                  {dayNumber(d.key)}
                </T>
              </View>
            </Tap>
          );
        })}
      </ScrollView>

      <Reveal delay={30}>
        <Tap onPress={() => router.push('/admin-qr' as any)} scale={0.98}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, borderRadius: radius.xl, padding: 16 }}>
            <View style={{ padding: 8, borderRadius: 14, backgroundColor: colors.white }}>
              {token ? <QRCode value={token} size={64} color={colors.brand} backgroundColor={colors.white} /> : <View style={{ width: 64, height: 64 }} />}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <T v="headline" color={colors.onBrand}>
                {t('aQrTitle')}
              </T>
              <T v="footnote" color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
                {t('aQrSub')}
              </T>
              <T v="footnote" weight="700" color={colors.onBrand} style={{ marginTop: 6 }}>
                {t('aQrShow')} ›
              </T>
            </View>
          </View>
        </Tap>
      </Reveal>

      <Reveal delay={45}>
        <Card style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/admin-settings' as any)} style={{ flex: 1, paddingRight: 10 }}>
            <T v="headline">{t('aOrdersUntil', { h: cutoffLabel(lang, cutoff) })}</T>
            <T v="footnote" color={colors.muted}>
              {t('aCutoffHint')}
            </T>
          </Pressable>
          <Button label={t('aModify')} kind="soft" small onPress={() => router.push('/admin-settings' as any)} />
        </Card>
      </Reveal>

      <Reveal delay={60} style={{ marginTop: 18 }}>
        <Segmented
          value={mode}
          // Un même plat ne peut pas être appelé par les deux modes : le mode se verrouille dès qu'un plat est appelé.
          onChange={(m) => called.length === 0 && setMode(m)}
          options={[
            { key: 'call', label: t('aModeCall') },
            { key: 'tables', label: t('aModeTables') },
          ]}
        />
        <T v="footnote" color={colors.muted} style={{ marginTop: 10, marginLeft: 4 }}>
          {called.length > 0 ? t('aModeLocked') : mode === 'call' ? t('aModeCallHint') : t('aModeTablesHint')}
        </T>
      </Reveal>

      {rows.length === 0 ? (
        <Card style={{ marginTop: 14 }}>
          <T v="body" color={colors.muted}>
            {t('aNoOrdersToday')}
          </T>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <T v="footnote" color={colors.muted} style={{ marginTop: 10, marginLeft: 4 }}>
          {t('aVariantLegend')}
        </T>
      ) : null}

      {rows.map(({ dish, total, variants, allergy }, i) => {
        const done = Math.min(total, served[dish.id] ?? 0);
        const isCalled = called.includes(dish.id);
        const table = pick[dish.id] ?? tables[dish.id];
        return (
          <Reveal key={dish.id} delay={90 + i * 40}>
            <Card style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DishTile emoji={dish.emoji} id={dish.id} size={54} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <T v="headline">{dishName(dish, lang)}</T>
                  <T v="subhead" weight="600" style={{ marginTop: 2 }}>
                    {t('aPortions', { n: total })}
                  </T>
                </View>
                {mode === 'call' && !isCalled ? <Button label={t('aCall')} small onPress={() => call(dish.id)} /> : null}
                {isCalled ? <Tag label={mode === 'tables' && tables[dish.id] ? `${t('aCalled')} · ${t('aTable', { t: tables[dish.id] })}` : t('aCalled')} tone="green" /> : null}
              </View>

              <View style={{ marginTop: 12, gap: 6 }}>
                {variants.map((v) => (
                  <View key={v.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: v.color, marginRight: 10 }} />
                    <T v="subhead" style={{ flex: 1 }}>
                      {v.removed.length ? v.removed.map((c) => t('aVariantWithout', { x: compName(c, lang).toLowerCase() })).join(', ') : t('aVariantStandard')}
                    </T>
                    <T v="headline">× {v.n}</T>
                  </View>
                ))}
              </View>

              {allergy.length ? (
                <View style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.redSoft, borderWidth: 1, borderColor: ALLERGY_COLOR }}>
                  <T v="subhead" weight="700" color={ALLERGY_COLOR}>
                    {t('aAllergyBatch')} · {allergy.length}
                  </T>
                  <T v="caption" color={colors.muted} style={{ marginTop: 2, marginBottom: 6 }}>
                    {t('aAllergyBatchHint')}
                  </T>
                  {allergy.map((a, k) => (
                    <T key={k} v="footnote">
                      {a.name} · {a.list.map((x) => (['peanut', 'fish', 'gluten', 'milk', 'egg', 'shellfish'].includes(x) ? allergenName(x as any, lang) : x)).join(', ')}
                    </T>
                  ))}
                </View>
              ) : null}

              {mode === 'tables' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                  <T v="footnote" color={colors.muted} style={{ marginRight: 4 }}>
                    {t('aTable', { t: '' }).trim()}
                  </T>
                  {TABLE_LETTERS.map((l) => {
                    const on = l === table;
                    return (
                      <Pressable
                        key={l}
                        onPress={() => !isCalled && setPick((p) => ({ ...p, [dish.id]: l }))}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: on ? colors.brand : colors.card,
                          borderWidth: 1,
                          borderColor: on ? colors.brand : colors.line,
                        }}
                      >
                        <T v="subhead" weight="700" color={on ? colors.onBrand : colors.text}>
                          {l}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {mode === 'tables' && !isCalled ? (
                <Button
                  label={table ? `${t('aCall')} · ${t('aTable', { t: table })}` : t('aPickTable')}
                  disabled={!table}
                  style={{ marginTop: 12 }}
                  onPress={() => table && call(dish.id, table)}
                />
              ) : null}
              {isCalled ? <Button label={t('aCancelCall')} kind="danger" small style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => cancelCall(dish.id)} /> : null}

              <View style={{ marginTop: 14 }}>
                <Progress value={done / total} tone={done >= total ? colors.green : colors.brand} />
                <T v="footnote" color={colors.muted} style={{ marginTop: 8 }}>
                  {t('aPickedUp', { a: done, b: total })}
                </T>
              </View>
            </Card>
          </Reveal>
        );
      })}

      <Section title={t('aIssues')}>
        {issues.length === 0 ? (
          <Card>
            <T v="body" color={colors.muted}>
              {t('aNoIssues')}
            </T>
          </Card>
        ) : (
          issues.map((iss) => {
            const dish = dishById(iss.dishId);
            return (
              <Card key={iss.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DishTile emoji={dish.emoji} id={dish.id} size={44} />
                  <T v="subhead" style={{ flex: 1, marginLeft: 12 }}>
                    {t('aIssueNotReceived', { name: iss.student, dish: dishName(dish, lang) })}
                  </T>
                </View>
                {iss.status === 'open' ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Button label={t('aResolve')} kind="soft" small style={{ flex: 1 }} onPress={() => setIssue(iss.id, 'resolved')} />
                    <Button label={t('aRefund')} small style={{ flex: 1 }} onPress={() => setIssue(iss.id, 'refunded')} />
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <Tag label={cap(iss.status === 'refunded' ? t('aRefunded') : t('aResolved'))} tone="green" />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Section>
    </Screen>
  );
}
