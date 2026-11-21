import { View } from 'react-native';
import { Tap } from './fx';
import { Card, T, Tag } from './ui';
import { EXAMPLE_PRICE, OFFERS, OfferId, discounted, offerById } from '../lib/data';
import { Key, longDay, money } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import type { ActiveOffer } from '../lib/types';
import { useI18n } from '../store/app';

const NAME: Record<OfferId, Key> = { week: 'offerWeek', month: 'offerMonth', year: 'offerYear' };

/** Nom lisible d'une offre (« Offre semaine »…). */
export function useOfferName() {
  const { t } = useI18n();
  return (id: OfferId) => t(NAME[id]);
}

/**
 * Les trois offres (semaine, mois, année) avec un exemple chiffré sur un plat à 1 000 F.
 * Une seule offre à la fois : tant que l'offre en cours n'est pas finie, les autres sont grisées.
 * `parent` : textes vouvoyés.
 */
export function OfferPicker({
  active,
  selected,
  onSelect,
  parent = false,
}: {
  active?: ActiveOffer;
  selected: OfferId;
  onSelect: (id: OfferId) => void;
  parent?: boolean;
}) {
  const { t, lang } = useI18n();
  const name = useOfferName();

  return (
    <View>
      {active ? (
        <Card style={{ marginBottom: 14, backgroundColor: colors.greenSoft, borderColor: colors.greenSoft }}>
          <T v="footnote" weight="700" color={colors.green} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('offerActiveTitle')}
          </T>
          <T v="headline" style={{ marginTop: 6 }}>
            {t(parent ? 'pOfferActive' : 'offerActive', { name: name(active.offer), pct: active.pct, date: longDay(active.endsOn, lang) })}
          </T>
          <T v="footnote" color={colors.muted} style={{ marginTop: 6 }}>
            {t(parent ? 'pOfferWait' : 'offerWait', { date: longDay(active.endsOn, lang) })}
          </T>
        </Card>
      ) : null}

      <View style={{ gap: 12 }}>
        {OFFERS.map((o) => {
          const on = !active && selected === o.id;
          const running = active?.offer === o.id;
          return (
            <Tap key={o.id} onPress={() => (!active ? onSelect(o.id) : undefined)} scale={active ? 1 : 0.98}>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? colors.brand : colors.line,
                  padding: 16,
                  opacity: active && !running ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T v="headline">{name(o.id)}</T>
                  {running ? <Tag label={t('offerRunning')} tone="green" /> : <Tag label={`−${o.pct} %`} />}
                </View>
                <T v="subhead" color={colors.muted} style={{ marginTop: 4 }}>
                  {t('offerDiscount', { pct: o.pct })} · {t('offerDuration', { days: o.days })}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
                  <T v="title2">{money(discounted(EXAMPLE_PRICE, o.pct))}</T>
                  <T v="subhead" color={colors.muted} style={{ marginLeft: 8, textDecorationLine: 'line-through' }}>
                    {money(EXAMPLE_PRICE)}
                  </T>
                </View>
                <T v="footnote" color={colors.muted} style={{ marginTop: 2 }}>
                  {t('offerExample', { full: money(EXAMPLE_PRICE), price: money(discounted(EXAMPLE_PRICE, o.pct)) })}
                </T>
                <T v="subhead" weight="600" style={{ marginTop: 10 }}>
                  {t('offerFee', { amount: money(o.fee) })}
                </T>
              </View>
            </Tap>
          );
        })}
      </View>
      <T v="footnote" color={colors.muted} style={{ marginTop: 14, marginLeft: 4 }}>
        {t(parent ? 'pOfferNote2' : 'offerNote')}
      </T>
    </View>
  );
}

export { offerById };
