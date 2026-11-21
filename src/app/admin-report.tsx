import { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, T } from '../components/ui';
import { signedPct } from '../lib/format';
import { dishName, longDay, money } from '../lib/i18n';
import { exportWeekReport, weekFigures } from '../lib/report';
import { colors } from '../lib/theme';
import { useAdmin } from '../store/admin';
import { useI18n } from '../store/app';

/** Rapport d'activité détaillé de la semaine, exportable en Excel. */
export default function AdminReport() {
  const { t, lang } = useI18n();
  const catalog = useAdmin((s) => s.catalog);
  const ingredients = useAdmin((s) => s.ingredients);
  const purchases = useAdmin((s) => s.purchases);
  const issues = useAdmin((s) => s.issues);
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const f = weekFigures(catalog, ingredients, purchases, issues);
  const soldChange = (f.sold - f.soldPrevious) / f.soldPrevious;

  const line = (label: string, value: string, color?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 }}>
      <T v="body" color={colors.muted} style={{ flex: 1, paddingRight: 10 }}>
        {label}
      </T>
      <T v="headline" color={color ?? colors.text} style={{ maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
  const trend = (x: number) => (x >= 0 ? colors.green : colors.red);

  const block = (title: string, children: ReactNode) => (
    <Card style={{ marginBottom: 12 }}>
      <T v="footnote" weight="600" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
        {title}
      </T>
      {children}
    </Card>
  );

  const doExport = async () => {
    setStatus('busy');
    try {
      await exportWeekReport(catalog, ingredients, purchases, issues);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('aReport') }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <T v="headline">{t('aReportSub', { from: longDay(f.from, lang), to: longDay(f.to, lang) })}</T>
        <T v="subhead" color={colors.muted} style={{ marginTop: 4, marginBottom: 16 }}>
          {t('aReportIntro')}
        </T>

        {block(
          t('aRevenueChart'),
          <>
            {line(t('aRevenueWeek'), money(f.revenue))}
            {line(t('aPrevWeek'), money(f.previous))}
            {line(t('aVsPrevious', { delta: '' }).trim(), signedPct(f.revenueChange), trend(f.revenueChange))}
            {line(t('aDishesSold'), `${f.sold} (${signedPct(soldChange)})`, trend(soldChange))}
            {line(t('aSatisfaction'), `${f.satisfaction} %`)}
          </>,
        )}
        {block(
          t('aSales'),
          <>
            {line(t('aOrders'), String(f.orders))}
            {line(t('aCancelled'), String(f.cancelled))}
            {line(t('aSubs'), String(f.subscriptions))}
            {f.top ? line(t('aTopDish'), `${dishName(f.top, lang)} · ${f.top.likes} %`, colors.green) : null}
            {f.flop ? line(t('aFlop'), `${dishName(f.flop, lang)} · ${f.flop.likes} %`, colors.warm) : null}
          </>,
        )}
        {block(
          t('aStockUsed'),
          <>
            {line(t('aPurchasesTotal'), `${money(f.purchases)} · ${t('aPurchasesCount', { n: f.purchaseCount })}`)}
            {line(t('aLosses'), `${money(f.lossValue)} (${f.lossPct} %)`, colors.red)}
            {line(t('aLowStocks'), f.lowStocks.map((i) => (lang === 'fr' ? i.fr : i.en)).join(', ') || '—', f.lowStocks.length ? colors.red : undefined)}
          </>,
        )}
        {block(
          t('aCredits'),
          <>
            {line(t('aCredits'), `${money(f.credit)} · ${t('aCreditStudents', { n: f.creditStudents })}`)}
            {line(t('aCreditMeals'), String(f.creditMeals))}
            {line(t('aCreditFees'), money(f.creditFees))}
            {line(t('aLowAlerts'), String(f.lowAlerts))}
          </>,
        )}
        {block(
          t('aIncidents'),
          <>
            {line(t('aIssuesCount'), `${f.issues} · ${t('aIssuesOpen', { n: f.issuesOpen })}`, f.issuesOpen ? colors.warm : undefined)}
            {line(t('aRefunds'), String(f.refunds))}
            {line(t('aUnconfirmed'), String(f.unconfirmed))}
          </>,
        )}
        {block(
          t('aNextWeek'),
          <>
            {line(t('aForecastDishes'), String(f.forecastDishes))}
            {line(t('aForecastRevenue'), money(f.forecastRevenue))}
          </>,
        )}

        <Button label={status === 'busy' ? '…' : t('aExportExcel')} disabled={status === 'busy'} style={{ marginTop: 12 }} onPress={doExport} />
        {status === 'done' ? (
          <T v="footnote" color={colors.green} weight="600" align="center" style={{ marginTop: 10 }}>
            {t('aExportedExcel')}
          </T>
        ) : null}
        {status === 'error' ? (
          <T v="footnote" color={colors.red} weight="600" align="center" style={{ marginTop: 10 }}>
            {t('aExportError')}
          </T>
        ) : null}
      </ScrollView>
    </>
  );
}
