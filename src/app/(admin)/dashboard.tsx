import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminHeader, BarChart, Section, StatCard } from '../../components/admin';
import { Reveal, Tap, useCountUp } from '../../components/fx';
import { Button, Card, DishPhoto, Screen, Segmented, T } from '../../components/ui';
import { DISHES } from '../../lib/data';
import { signedPct } from '../../lib/format';
import { Key, cap, dishName, longDay, money, shortDay } from '../../lib/i18n';
import { colors, radius } from '../../lib/theme';
import { ChartPoint, Period, serviceDay, useAdmin } from '../../store/admin';
import { useI18n } from '../../store/app';

const PERIOD_LABEL: Record<Period, Key> = { day: 'aPeriodToday', week: 'aPeriodWeek', month: 'aPeriodMonth' };

/** Carte principale : recettes de la période, détaillées par tarif. */
function RevenueHero({ period }: { period: Period }) {
  const { t } = useI18n();
  const k = useAdmin((s) => s.stats[period]);
  const shown = useCountUp(k.revenue);
  const delta = k.previous > 0 ? (k.revenue - k.previous) / k.previous : 0;
  const up = delta >= 0;
  const row = (label: string, count: number, amount: number) => (
    <View style={{ flex: 1 }}>
      <T v="caption" color="rgba(255,255,255,0.6)">
        {label}
      </T>
      <T v="headline" color={colors.white} style={{ marginTop: 2 }}>
        {money(amount)}
      </T>
      <T v="caption" color="rgba(255,255,255,0.6)">
        {count}
      </T>
    </View>
  );
  return (
    <LinearGradient colors={['#1E293B', '#0F172A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 20, overflow: 'hidden', marginTop: 14 }}>
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.7 }}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <T v="subhead" color="rgba(255,255,255,0.7)">
        {t('aCollected')} · {t(PERIOD_LABEL[period]).toLowerCase()}
      </T>
      <T color={colors.white} style={{ fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.6, marginTop: 2 }}>
        {money(shown)}
      </T>
      <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: up ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
        <T v="caption" weight="700" color={up ? '#4ADE80' : '#F87171'}>
          {t('aVsPrevious', { delta: signedPct(delta) })}
        </T>
      </View>
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {row(t('aStandard'), k.standard, k.standardRevenue)}
        {row(t('aPromo'), k.promo, k.promoRevenue)}
      </View>
    </LinearGradient>
  );
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState<Period>('day');
  const [chart, setChart] = useState<'revenue' | 'sold'>('revenue');
  const stats = useAdmin((s) => s.stats);
  const openIssues = useAdmin((s) => s.issues.filter((i) => i.status === 'open').length);
  const k = stats[period];
  const top = k.topDish ? DISHES.find((d) => d.id === k.topDish) : undefined;
  const points: ChartPoint[] = period === 'day' ? stats.chartDay : period === 'week' ? stats.chartWeek : stats.chartMonth;
  const labelOf = (p: ChartPoint, i: number) =>
    period === 'day'
      ? shortDay(p.d, lang)
      : period === 'week'
        ? i === points.length - 1
          ? lang === 'fr'
            ? 'Cette'
            : 'This'
          : `${lang === 'fr' ? 'S' : 'W'}-${points.length - 1 - i}`
        : cap(new Date(p.d + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }).replace('.', ''));
  const data = points.map((p, i) => ({ label: labelOf(p, i), value: chart === 'revenue' ? p.revenue : p.sold }));

  return (
    <Screen topPad={10}>
      <AdminHeader title={t('aDashboard')} subtitle={cap(longDay(serviceDay(), lang))} />

      <Reveal delay={30}>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { key: 'day', label: t('aDay') },
            { key: 'week', label: t('aWeek') },
            { key: 'month', label: t('aMonth') },
          ]}
        />
        <RevenueHero period={period} />
      </Reveal>

      <Reveal delay={120}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
          <StatCard label={t('aDishesSold')} value={k.sold.toLocaleString('fr-FR')} detail={t(PERIOD_LABEL[period])} />
          <StatCard label={t('aSatisfaction')} value={k.sold > 0 && k.satisfaction > 0 ? `${k.satisfaction} %` : '—'} detail={t(PERIOD_LABEL[period])} tone="green" />
          {openIssues > 0 ? <StatCard label={t('aIssues')} value={String(openIssues)} detail={t('aIssueOpen')} tone="red" /> : null}
          <StatCard label={t('aCredits')} value={money(stats.creditTotal)} detail={t('aCreditStudents', { n: stats.creditStudents })} tone="warm" />
          <StatCard
            label={t('aPickups')}
            value={`${stats.pickupsToday ? Math.round((stats.pickupsDone / stats.pickupsToday) * 100) : 0} %`}
            detail={`${stats.pickupsDone} / ${stats.pickupsToday} · ${t('aPeriodToday').toLowerCase()}`}
          />
        </View>
      </Reveal>

      <Reveal delay={180}>
        <Section title={chart === 'revenue' ? t('aRevenueChart') : t('aSoldChart')}>
          <Card>
            <Segmented
              value={chart}
              onChange={setChart}
              options={[
                { key: 'revenue', label: t('aCollected') },
                { key: 'sold', label: t('aSoldChart') },
              ]}
            />
            <BarChart data={data} unit={chart === 'revenue' ? 'money' : 'count'} />
          </Card>
        </Section>
      </Reveal>

      {top ? (
      <Reveal delay={230}>
        <Section title={`${t('aTopDish')} · ${t(PERIOD_LABEL[period]).toLowerCase()}`}>
          <Tap onPress={() => router.push('/admin-reviews' as any)} scale={0.98}>
            <View style={{ height: 180, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.brand }}>
              <DishPhoto id={top.id} emoji={top.emoji} height={180} radius={0} />
              <LinearGradient colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.88)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }} />
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <T v="title2" color={colors.white}>
                    {dishName(top, lang)}
                  </T>
                  <T v="footnote" color="rgba(255,255,255,0.75)">
                    {t('aVotes', { n: top.votes })}
                  </T>
                </View>
                {top.votes > 0 ? (
                  <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <T v="headline" color={colors.text}>
                      👍 {top.likes} %
                    </T>
                  </View>
                ) : null}
              </View>
            </View>
          </Tap>
        </Section>
      </Reveal>
      ) : null}

      <Reveal delay={280}>
        <Section title={t('aForecast')}>
          <Card padded={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <T v="body">{t('aForecastDishes')}</T>
              <T v="headline">{stats.forecastDishes}</T>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <T v="body" style={{ flex: 1, paddingRight: 8 }}>
                {t('aForecastRevenue')}
              </T>
              <T v="headline">{money(stats.forecastWeekRevenue)}</T>
            </View>
          </Card>
        </Section>
      </Reveal>

      <Button label={t('aGenerateReport')} style={{ marginTop: 24 }} onPress={() => router.push('/admin-report' as any)} />
    </Screen>
  );
}
