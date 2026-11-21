import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Clé publique (« publishable ») : elle peut figurer dans l'app, c'est la sécurité des tables (RLS) qui protège les données.
export const SUPABASE_URL = 'https://mquoiwpgtjrvdicwghdx.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_MGYe53eBwQIsGKwxwooJ6A_xVjLLSEm';

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/** Identifiant saisi (matricule ou identifiant) → adresse technique utilisée par Supabase Auth. */
export const emailOf = (login: string) => `${login.trim().toLowerCase()}@vatel.local`;
