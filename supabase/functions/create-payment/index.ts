// Crée une demande de paiement Jèko pour recharger le wallet d'un élève (ou payer l'abonnement).
// Appelée par l'app avec la session de l'utilisateur. Les clés Jèko restent dans les secrets Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const METHODS = ['wave', 'orange', 'mtn', 'moov', 'djamo'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    if (!u.user) return json({ error: 'unauthorized' }, 401);

    const { student_id, amount, method, phone, purpose = 'topup', offer_id = null } = await req.json();
    if (!METHODS.includes(method)) return json({ error: 'bad_method' }, 400);
    if (!Number.isInteger(amount) || amount < 100 || amount > 1_000_000) return json({ error: 'bad_amount' }, 400);
    if (typeof student_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(student_id)) return json({ error: 'bad_student' }, 400);
    if (phone && !/^\+?\d[\d\s]{7,14}$/.test(String(phone))) return json({ error: 'bad_phone' }, 400);
    if (!['topup', 'subscription'].includes(purpose)) return json({ error: 'bad_purpose' }, 400);

    const { data: allowed } = await asUser.rpc('can_see_student', { sid: student_id });
    if (!allowed) return json({ error: 'forbidden' }, 403);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Abonnement : le prix vient de la base (jamais du téléphone) et une seule offre à la fois.
    if (purpose === 'subscription') {
      if (!['week', 'month', 'year'].includes(offer_id)) return json({ error: 'bad_offer' }, 400);
      const { data: offer } = await admin.from('offers').select('fee').eq('id', offer_id).maybeSingle();
      if (!offer || offer.fee !== amount) return json({ error: 'bad_amount' }, 400);
      const { data: free } = await admin.rpc('can_subscribe', { p_student: student_id });
      if (!free) return json({ error: 'already_subscribed' }, 409);
    }
    const reference = 'VATEL-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
    const { data: pay, error: insErr } = await admin
      .from('payments')
      .insert({ payer_id: u.user.id, student_id, purpose, offer_id: purpose === 'subscription' ? offer_id : null, amount, method, payer_phone: phone ?? null, reference })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    const direct = typeof phone === 'string' && phone.length > 0;
    const digits = direct ? phone.replace(/[^\d]/g, '') : '';
    const msisdn = digits.startsWith('225') ? '+' + digits : '+225' + digits;
    const back = (ok: boolean) => `https://vatel.app/paiement/${ok ? 'succes' : 'echec'}?reference=${reference}`;

    const res = await fetch('https://api.jeko.africa/partner_api/payment_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': Deno.env.get('JEKO_API_KEY')!,
        'X-API-KEY-ID': Deno.env.get('JEKO_API_KEY_ID')!,
      },
      body: JSON.stringify({
        amountCents: amount * 100,
        currency: 'XOF',
        reference,
        storeId: Deno.env.get('JEKO_STORE_ID'),
        paymentDetails: {
          type: 'redirect',
          data: {
            paymentMethod: method,
            successUrl: back(true),
            errorUrl: back(false),
            ...(direct ? { forceProviderDirect: true, payerPhone: msisdn } : {}),
          },
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      await admin.from('payments').update({ status: 'failed', failure_reason: body?.message ?? String(res.status) }).eq('id', pay.id);
      return json({ error: body?.message ?? 'jeko_error', status: res.status }, 400);
    }
    await admin.from('payments').update({ jeko_id: body.id, redirect_url: body.redirectUrl }).eq('id', pay.id);
    return json({ payment_id: pay.id, reference, redirect_url: body.redirectUrl, direct });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
