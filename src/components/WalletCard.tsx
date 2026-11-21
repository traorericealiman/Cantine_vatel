import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { EyeIcon } from './icons';
import { Reveal, Tap, useCountUp } from './fx';
import { useOfferName } from './offers';
import { T } from './ui';
import { MAX_CREDIT_DISHES } from '../lib/data';
import { longDay, money } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { AYA_ID, useApp, useChildWallet, useI18n } from '../store/app';

/** Carte resserrée, sans zone vide : libellé en haut, puis le solde avec l'œil et le « + » sur la même ligne. */
export function WalletCard({ childId }: { childId?: string } = {}) {
  const { t, lang } = useI18n();
  const offerName = useOfferName();
  // L'accueil parent affiche déjà l'offre de l'enfant : ici, seulement côté élève.
  const offer = useApp((s) => (!childId && s.uid ? s.subscriptions[s.uid] : undefined));
  // Espace élève : son propre wallet. Espace parent : celui de l'enfant choisi, et « + » ouvre la recharge parent.
  const wallet = useChildWallet(childId ?? AYA_ID);
  const { balance, debt, creditCount } = wallet;
  const hiddenByUser = useApp((s) => s.balanceHidden);
  const ready = useApp((s) => s.dataReady);
  // Tant que les données ne sont pas arrivées, le solde reste masqué plutôt que d'afficher un faux zéro.
  const hidden = hiddenByUser || !ready;
  const toggle = useApp((s) => s.toggleBalanceHidden);
  const shown = useCountUp(balance);

  return (
    <Reveal delay={60}>
      <LinearGradient
        colors={['#2B3A52', '#141D31', '#0B1222']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 30,
          paddingHorizontal: 22,
          paddingTop: 20,
          paddingBottom: 22,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          shadowColor: '#0F172A',
          shadowOpacity: 0.38,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30 }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="subhead" color="rgba(255,255,255,0.88)">
            {t('availableBalance')}
          </T>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
            <T v="caption" weight="600" color="rgba(255,255,255,0.9)">
              FCFA
            </T>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <T color={colors.white} style={{ flex: 1, fontSize: 38, lineHeight: 46, fontWeight: '700', letterSpacing: -1.4, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {hidden ? '••••••' : money(shown)}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={toggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={hidden ? t('showBalance') : t('hideBalance')}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.28)',
              })}
            >
              <EyeIcon off={hidden} size={26} />
            </Pressable>
            <Tap
              onPress={() => router.push((childId ? `/parent-recharge?child=${childId}` : '/recharge') as any)}
              scale={0.9}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
            >
              <T color={colors.night} style={{ fontSize: 30, lineHeight: 34, fontWeight: '500' }}>
                +
              </T>
            </Tap>
          </View>
        </View>

        {debt > 0 ? (
          <T v="footnote" weight="600" color="#FFC889" style={{ marginTop: 6 }}>
            {t('debtLine')} · {hidden ? '••••' : money(debt)} · {t('creditUsed', { n: Math.min(creditCount, MAX_CREDIT_DISHES) })}
          </T>
        ) : null}
        {offer ? (
          <T v="footnote" weight="600" color="#86EFAC" style={{ marginTop: 6 }}>
            {t('offerActive', { name: offerName(offer.offer), pct: offer.pct, date: longDay(offer.endsOn, lang) })}
          </T>
        ) : null}
      </LinearGradient>
    </Reveal>
  );
}
