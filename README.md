# Cantine de Vatel

Application de cantine pour une école de Côte d'Ivoire. Les élèves commandent leurs repas depuis leur téléphone, les parents rechargent le wallet de leurs enfants par Mobile Money (Wave, Orange, MTN, Moov, Djamo via Jèko), et l'équipe de la cantine gère le service, les menus et les stocks.

Le projet a deux applications et un backend :

| Dossier | Contenu |
| --- | --- |
| `src/` | **Application mobile** (Expo SDK 58, React Native, expo-router, zustand, TypeScript) : espaces élève/employé, parent et administrateur |
| `web-admin/` | **Console web d'administration** (React + Vite) : tableau de bord et gestion des utilisateurs |
| `supabase/` | Backend : migrations SQL (schéma, règles métier, sécurité) et fonctions Edge (`create-payment`, `jeko-webhook`, `manage-users`) |
| `tests/` | Tests automatiques des règles métier |
| `docs/` | Spécifications |

## Fonctionnalités

### Application mobile

**Espace élève / employé**
- Menu de la semaine avec photos, composition du plat (on peut retirer des ingrédients) et avis 👍 / 👎.
- Commande jusqu'à l'heure limite fixée par l'admin : un seul plat par catégorie et par jour (entrée, plat, dessert). Le solde est débité tout de suite, l'annulation avant l'heure limite rembourse.
- Wallet : solde, historique, recharge par Mobile Money.
- Crédit d'urgence : jusqu'à 3 plats à crédit (le premier au prix normal, les suivants avec des frais de dépannage). La prochaine recharge rembourse la dette en premier.
- Retrait du repas en scannant le QR code affiché au comptoir.
- Favoris : on garde ses plats préférés et l'app propose de les commander dès qu'ils sont au menu (« Me prévenir »). Aucune commande sans confirmation.
- Recommandations personnalisées (commandes, avis, favoris) ; les plats concernés par les allergies déclarées ne sont jamais recommandés.
- Allergies (cases et saisie libre), notifications (cloche), signalement « plat non reçu », français / anglais.

**Espace parent**
- Un ou plusieurs enfants, avec leur solde, leurs repas à venir et leur historique (le parent ne commande jamais à la place de l'enfant).
- Recharge du wallet de chaque enfant, offre annuelle, alerte « solde bas » avec seuil réglable.

**Espace administrateur**
- Tableau de bord jour / semaine / mois : recettes, plats vendus, satisfaction, plat préféré, prévisions.
- Service en direct : appel par plat ou par table, variantes de plats (ingrédients retirés) avec couleurs, lot allergie séparé, signalements.
- Menus : catalogue de plats (avec photos), menu de chaque jour, publication.
- Stocks : ingrédients, recettes, achats, consommation, inventaire hebdomadaire.
- QR code de retrait, réglages (heure limite, prix de l'offre annuelle), avis des élèves, rapport détaillé exportable en Excel.

### Console web d'administration

- Tableau de bord : KPI jour / semaine / mois, graphiques recettes-dépenses et plats vendus, indicateurs de stock.
- Utilisateurs : création des comptes élèves et parents, réinitialisation des mots de passe, liens parents ↔ élèves.

## Lancer le projet

Prérequis : Node.js 20 ou plus récent, et l'application **Expo Go** sur le téléphone (ou un émulateur Android / simulateur iOS).

### Version mobile

```bash
npm install
npx expo start
```

Scanner le QR code affiché avec Expo Go (Android) ou l'appareil photo (iPhone). Si le téléphone et l'ordinateur ne sont pas sur le même réseau, ajouter `--tunnel`.

Aperçu dans le navigateur (format téléphone) :

```bash
npx expo start --web
```

Le scan du QR code de retrait utilise l'appareil photo : il faut un vrai téléphone (ou le lien de simulation en développement).

### Version web (console d'administration)

```bash
cd web-admin
npm install
npm run dev
```

La console s'ouvre sur http://localhost:5173 ; se connecter avec le compte administrateur. Pour construire la version de production : `npm run build` (le dossier `dist/` peut être déployé sur Vercel).

### Vérifications

```bash
npm run typecheck   # types TypeScript
npm run lint        # ESLint
npm test            # règles métier : recharge, crédit d'urgence, allergies, catégories
```

## Configuration

Les clés publiques Supabase sont dans `src/lib/supabase.ts` (et dans `web-admin/`). Les clés Jèko ne sont jamais dans le code : elles sont enregistrées comme secrets des fonctions Edge (`JEKO_API_KEY`, `JEKO_API_KEY_ID`, `JEKO_STORE_ID`, `JEKO_WEBHOOK_SECRET`). Le webhook à déclarer chez Jèko est la fonction `jeko-webhook` du projet Supabase.

## Architecture

- **La base est la source de vérité.** Les règles qui touchent à l'argent (débit à la commande, crédit d'urgence, remboursement, retrait, recharge) sont des fonctions SQL sécurisées : le téléphone ne peut pas les contourner. Le store (`src/store/app.ts`) met l'écran à jour tout de suite puis recopie l'état du serveur.
- **Règles pures et testées** : `src/lib/rules.ts` ; types partagés : `src/lib/types.ts` ; données et réglages : `src/lib/data.ts` ; textes FR/EN : `src/lib/i18n.ts` (jamais de texte en dur dans les écrans).
- **Trois rôles**, un groupe d'écrans chacun : `(tabs)` élève, `(parent)`, `(admin)`. L'admin a son propre store (`src/store/admin.ts`).
- **Paiement** : l'app appelle `create-payment`, Jèko prévient `jeko-webhook` (signature vérifiée) qui crédite le wallet une seule fois.

## Sécurité

- Row Level Security sur toutes les tables ; chaque fonction exposée vérifie l'identité et le rôle.
- Comptes créés uniquement par la fonction Edge `manage-users`, réservée à l'administrateur.
- Webhook : signature obligatoire, comparée en temps constant ; montants et identifiants validés.
- Photos des plats : lecture publique, écriture réservée à l'admin.
