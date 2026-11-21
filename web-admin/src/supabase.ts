import { createClient } from '@supabase/supabase-js';

// Clé publique (« publishable ») : elle peut figurer dans l'application web, c'est la sécurité des tables qui protège les données.
const SUPABASE_URL = 'https://mquoiwpgtjrvdicwghdx.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_MGYe53eBwQIsGKwxwooJ6A_xVjLLSEm';

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** Identifiant saisi → adresse technique utilisée par Supabase Auth. */
export const emailOf = (login: string) => `${login.trim().toLowerCase()}@vatel.local`;
