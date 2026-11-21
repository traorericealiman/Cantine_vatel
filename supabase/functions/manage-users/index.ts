// Gestion des comptes par l'administrateur général : création (identifiant + mot de passe par défaut),
// réinitialisation du mot de passe, liens parent-élève. Utilise la clé de service, donc réservé au rôle « admin ».
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const emailOf = (login: string) => `${login.trim().toLowerCase()}@vatel.local`;

// Mot de passe par défaut : 8 caractères lisibles + un chiffre (au moins une lettre et un chiffre).
function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '7';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await asUser.auth.getUser();
    if (!u.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: me } = await admin.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
    if (me?.role !== 'admin') return json({ error: 'forbidden' }, 403);

    const body = await req.json();

    if (body.action === 'list') {
      const [p, w, l] = await Promise.all([
        admin.from('profiles').select('id,role,login,full_name,first_name,class_name,must_change_password,created_at').order('created_at', { ascending: false }),
        admin.from('wallets').select('student_id,balance,debt'),
        admin.from('parent_links').select('parent_id,student_id'),
      ]);
      return json({ users: p.data ?? [], wallets: w.data ?? [], links: l.data ?? [] });
    }

    if (body.action === 'create') {
      const role = body.role;
      const login = String(body.login ?? '').trim();
      const fullName = String(body.fullName ?? '').trim();
      if (!['student', 'parent'].includes(role)) return json({ error: 'bad_role' }, 400);
      if (!/^[A-Za-z0-9._-]{3,40}$/.test(login)) return json({ error: 'bad_login' }, 400);
      if (fullName.length < 2) return json({ error: 'bad_name' }, 400);
      const password = String(body.password ?? '').length >= 8 ? String(body.password) : genPassword();

      const { data: created, error: e1 } = await admin.auth.admin.createUser({
        email: emailOf(login),
        password,
        email_confirm: true,
        user_metadata: { login },
      });
      if (e1 || !created.user) return json({ error: /already|registered|exists/i.test(e1?.message ?? '') ? 'login_taken' : (e1?.message ?? 'create_failed') }, e1 ? 409 : 500);

      const { error: e2 } = await admin.from('profiles').insert({
        id: created.user.id,
        role,
        login,
        full_name: fullName,
        first_name: String(body.firstName ?? '').trim() || fullName.split(' ')[0],
        class_name: role === 'student' ? (String(body.className ?? '').trim() || null) : null,
        must_change_password: true,
        allergies_done: role !== 'student',
      });
      if (e2) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: /duplicate|unique/i.test(e2.message) ? 'login_taken' : e2.message }, 409);
      }
      // Un parent peut être rattaché à ses enfants dès la création.
      if (role === 'parent' && Array.isArray(body.students) && body.students.length) {
        await admin.from('parent_links').insert(body.students.map((s: string) => ({ parent_id: created.user.id, student_id: s })));
      }
      return json({ id: created.user.id, login, password });
    }

    if (body.action === 'reset') {
      const { data: target } = await admin.from('profiles').select('role').eq('id', body.id).maybeSingle();
      if (!target || !['student', 'parent'].includes(target.role)) return json({ error: 'bad_target' }, 400);
      const password = String(body.password ?? '').length >= 8 ? String(body.password) : genPassword();
      const { error } = await admin.auth.admin.updateUserById(body.id, { password });
      if (error) return json({ error: error.message }, 500);
      await admin.from('profiles').update({ must_change_password: true }).eq('id', body.id);
      return json({ password });
    }

    if (body.action === 'link' || body.action === 'unlink') {
      const { parentId, studentId } = body;
      const { data: ps } = await admin.from('profiles').select('id,role').in('id', [parentId, studentId]);
      const okParent = ps?.some((x) => x.id === parentId && x.role === 'parent');
      const okStudent = ps?.some((x) => x.id === studentId && x.role === 'student');
      if (!okParent || !okStudent) return json({ error: 'bad_link' }, 400);
      const q =
        body.action === 'link'
          ? admin.from('parent_links').upsert({ parent_id: parentId, student_id: studentId }, { onConflict: 'parent_id,student_id', ignoreDuplicates: true })
          : admin.from('parent_links').delete().eq('parent_id', parentId).eq('student_id', studentId);
      const { error } = await q;
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
