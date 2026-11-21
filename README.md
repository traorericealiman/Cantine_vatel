# Cantine de Vatel

Application de cantine pour une école de Côte d'Ivoire : commande des repas, wallet rechargeable par Mobile Money (Jèko), favoris, avis, espaces **élève / employé**, **parent** et **administrateur**, plus une console web d'administration.

| Dossier | Rôle |
| --- | --- |
| `src/` | application mobile (Expo SDK 58, React Native, expo-router, zustand, TypeScript) |
| `web-admin/` | console web d'administration (React + Vite), déployée sur Vercel |
| `supabase/migrations/` | schéma, règles métier (fonctions SQL), sécurité (RLS), données de départ |
| `supabase/functions/` | fonctions Edge : `create-payment`, `jeko-webhook`, `manage-users` |
| `tests/` | tests automatiques des règles métier |
| `docs/` | spécifications |

## Lancer

```bash
npm install
npx expo start            # téléphone (Expo Go) ou --web pour le navigateur
npm run typecheck         # tsc --noEmit
npm run lint              # eslint src
npm test                  # règles métier (recharge, crédit d'urgence, allergies, catégories)
cd web-admin && npm install && npm run dev
```

Les clés publiques Supabase sont dans `src/lib/supabase.ts`. Les clés Jèko ne sont **jamais** dans le code : elles vivent dans les secrets des fonctions Edge (`JEKO_API_KEY`, `JEKO_API_KEY_ID`, `JEKO_STORE_ID`, `JEKO_WEBHOOK_SECRET`).

## Architecture

- **Source de vérité = la base.** Les règles qui touchent à l'argent (débit à la commande, crédit d'urgence, remboursement, retrait par QR code, recharge) sont des fonctions SQL `SECURITY DEFINER` : le téléphone ne peut pas les contourner. Le store zustand (`src/store/app.ts`) fait une mise à jour optimiste puis recopie l'état du serveur (`refresh`).
- **Règles pures** (testables sans réseau) : `src/lib/rules.ts` ; types partagés : `src/lib/types.ts` ; données et réglages : `src/lib/data.ts` ; textes FR/EN : `src/lib/i18n.ts` (jamais de texte en dur dans les écrans).
- **Trois rôles**, un groupe de routes chacun : `(tabs)` élève, `(parent)`, `(admin)` ; les layouts redirigent les autres rôles. L'admin a son propre store (`src/store/admin.ts`).
- **Paiement** : l'app appelle `create-payment` (montant et numéro validés), Jèko prévient `jeko-webhook` (signature HMAC vérifiée en temps constant) qui crédite le wallet une seule fois.

## Sécurité

- Row Level Security sur toutes les tables ; chaque fonction exposée vérifie `auth.uid()` et le rôle.
- Comptes créés uniquement par la fonction Edge `manage-users` (clé de service, réservée à l'admin).
- Webhook : signature obligatoire, comparaison en temps constant, montants et identifiants validés.
- Le bucket de photos `dishes` est en lecture publique, écriture réservée à l'admin.
- Contrôle automatique : `get_advisors` (Supabase) ne signale plus d'erreur ; les avertissements restants sont les fonctions volontairement appelables (chacune contrôle l'identité).

## Mode démonstration (à couper avant la production)

`settings.demo_mode` (réglage « Mode démonstration » dans l'espace admin) autorise `demo_topup`, `demo_subscribe` et le retrait simplifié, et affiche « Recharge de démonstration ». **Mettre le réglage sur « désactivé » avant d'ouvrir l'app aux élèves.**

Avant la production, il reste aussi à :
- supprimer les comptes et données de test (`supabase/seed_demo_admin.md`) ;
- activer la protection contre les mots de passe divulgués (Supabase › Authentication) ;
- créditer les auteurs des photos (`src/lib/credits.ts`, licences CC BY / CC BY-SA) ;
- régler l'envoi des notifications push (non activé : seule la cloche dans l'app est utilisée).
