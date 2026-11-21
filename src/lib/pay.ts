import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export type PayMethod = 'wave' | 'orange' | 'mtn' | 'moov' | 'djamo';
export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange', label: 'Orange Money' },
  { id: 'mtn', label: 'MTN MoMo' },
  { id: 'moov', label: 'Moov Money' },
  { id: 'djamo', label: 'Djamo' },
];

export type PayOutcome = 'success' | 'failed' | 'timeout' | 'error';

/**
 * Lance un paiement Jèko (fonction `create-payment`) puis attend la confirmation du webhook.
 * Avec un numéro, le paiement part directement chez l'opérateur ; sans numéro, la page de paiement Jèko s'ouvre.
 */
export async function payWithJeko(opts: {
  studentId: string;
  amount: number;
  method: PayMethod;
  phone?: string;
  purpose?: 'topup' | 'subscription';
}): Promise<PayOutcome> {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { student_id: opts.studentId, amount: opts.amount, method: opts.method, phone: opts.phone || undefined, purpose: opts.purpose ?? 'topup' },
  });
  if (error || !data?.payment_id) return 'error';
  // Wave, Orange et Djamo : on ouvre le lien de l'opérateur ou la page Jèko. MTN et Moov en mode direct : message USSD sur le téléphone.
  const ussd = data.direct && (opts.method === 'mtn' || opts.method === 'moov');
  if (data.redirect_url && !ussd) {
    if (Platform.OS === 'web') window.open(data.redirect_url, '_blank');
    else Linking.openURL(data.redirect_url).catch(() => {});
  }
  // On attend jusqu'à 4 minutes que le webhook marque le paiement comme réussi.
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data: p } = await supabase.from('payments').select('status').eq('id', data.payment_id).maybeSingle();
    if (p?.status === 'success') return 'success';
    if (p?.status === 'failed' || p?.status === 'expired') return 'failed';
  }
  return 'timeout';
}
