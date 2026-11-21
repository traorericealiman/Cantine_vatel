// Reçoit les notifications Jèko. Vérifie la signature HMAC-SHA256 du corps brut, puis crédite le wallet.
import { createClient } from 'npm:@supabase/supabase-js@2';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
}

// Comparaison en temps constant : ne révèle rien sur la signature attendue.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const raw = await req.text();
  const secret = Deno.env.get('JEKO_WEBHOOK_SECRET');
  if (!secret) return new Response('not configured', { status: 500 });
  const received = req.headers.get('Jeko-Signature') ?? '';
  if (!safeEqual(await sign(secret, raw), received.toLowerCase())) return new Response('bad signature', { status: 401 });

  const payload = JSON.parse(raw);
  const reference = payload?.transactionDetails?.reference;
  // Seuls les encaissements réussis nous intéressent (les autres événements reçoivent juste un 200).
  if (!reference || payload.transactionType !== 'payment' || payload.status !== 'success') return new Response('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Idempotent : seule la 1re livraison passe de « pending » à « success ».
  const { data: pay } = await admin
    .from('payments')
    .update({ status: 'success', completed_at: new Date().toISOString() })
    .eq('reference', reference)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (!pay) return new Response('already handled');

  if (pay.purpose === 'subscription') {
    await admin.from('subscriptions').upsert({
      student_id: pay.student_id,
      starts_on: new Date().toISOString().slice(0, 10),
      ends_on: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      payment_id: pay.id,
    });
  } else {
    await admin.rpc('credit_wallet', { p_student: pay.student_id, p_amount: pay.amount, p_payment: pay.id });
  }
  return new Response('ok');
});
