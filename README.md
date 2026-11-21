# Cantine de Vatel

Application de gestion de cantine pour une école de Côte d'Ivoire.

Les élèves et employés commandent leurs repas depuis leur téléphone et paient avec un wallet. Les parents suivent et rechargent le compte de leurs enfants par Mobile Money. L'équipe de la cantine gère les menus, les quantités, le service, les stocks et les chiffres de l'activité.

## Accès rapide

### Application mobile

**Télécharger l'APK Android :** https://expo.dev/artifacts/eas/EA5w82MwpFFIMnrN3L8mHj7YTwZhshWGgw3xjY7QG-M.apk

| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Élève | `VAT-24-0412` | `AZERTY@1234` |
| Parent | `parent.koffi` | `AZERTY@1234` |
| Admin restaurant | `admin` | `AZERTY@1234` |

### Console web d'administration

- **Adresse :** https://vatel-admin.vercel.app/
- **Identifiant :** `admin.web`
- **Mot de passe :** `AdminWeb2026`

## Vue d'ensemble

| Partie | Dossier | Technologies | Rôle |
| --- | --- | --- | --- |
| Application mobile | `src/` | Expo SDK 58, React Native, expo-router, zustand, TypeScript | Espaces élève/employé, parent et admin restaurant |
| Console web | `web-admin/` | React, Vite, Recharts, TypeScript, Vercel | Pilotage et gestion des utilisateurs |
| Backend | `supabase/` | PostgreSQL, Auth, Storage, Realtime, Edge Functions | Données, règles métier, sécurité et paiements |
| Paiement | `supabase/functions/` | Jèko | Wave, Orange Money, MTN, Moov et Djamo |
| Tests | `tests/` | Node.js | Règles métier |
| Documentation | `docs/` | PDF | Spécifications |

```text
Application mobile ─┐
                    ├── Supabase (base, règles SQL, authentification, temps réel)
Console web ────────┘        │
                             ├── create-payment ──> Jèko
                             └── jeko-webhook   <── Confirmation du paiement
```

## Fonctionnalités

### Espace élève / employé

**Menu et commande**
- Menu de la semaine avec photos, composition, prix, avis 👍 / 👎 et nombre de plats disponibles.
- Commande jusqu'à l'heure limite fixée par l'admin.
- Un seul plat par catégorie et par jour : une entrée, un plat de résistance, un dessert.
- Possibilité de retirer certains ingrédients.
- Quantités limitées : les premiers arrivés sont servis. Quand un plat est complet, il faut en choisir un autre.
- Annulation remboursée tant que l'heure limite n'est pas passée et que le plat n'a pas été appelé.

**Wallet**
- Solde, historique des opérations et recharge par Mobile Money.
- Le solde est débité dès la confirmation de la commande.
- Crédit d'urgence : 3 plats maximum, le premier au prix normal, les deux suivants avec 10 % de frais de dépannage.
- La prochaine recharge rembourse d'abord la dette.

**Offres promotionnelles**

| Offre | Durée | Réduction | Exemple sur un plat à 1 000 F |
| --- | --- | --- | --- |
| Semaine | 7 jours | 5 % | 950 F |
| Mois | 30 jours | 7 % | 930 F |
| Année | 365 jours | 15 % | 850 F |

- Une seule offre à la fois : il faut attendre la fin de l'offre en cours pour en prendre une autre.
- L'offre active, sa réduction et sa date de fin sont visibles sur la carte wallet.
- Le prix normal est barré, et seul le prix réduit est débité.

**Favoris**
- **Désactivé :** le plat reste simplement dans les favoris.
- **Me demander :** l'élève reçoit une proposition à accepter quand le plat est disponible.
- **Automatique :** le plat est commandé dès qu'il est disponible, si le solde suffit et s'il ne contient pas d'allergène déclaré.
- Si une place se libère sur un plat complet, elle est proposée ou attribuée aux favoris suivants.

**Autres fonctions**
- Recommandations selon les commandes, avis et favoris.
- Allergies déclarées : les plats concernés affichent un avertissement et ne sont jamais recommandés.
- Retrait du repas en scannant le QR code du comptoir, même avec une connexion instable.
- Notifications dans l'application, signalement d'un plat non reçu, FAQ, français et anglais.

### Espace parent

- Suivi d'un ou plusieurs enfants : solde, dette, repas à venir et historique.
- Recharge du wallet de chaque enfant.
- Souscription d'une offre semaine, mois ou année.
- Alerte de solde bas avec seuil réglable.
- Le parent ne commande jamais à la place de l'enfant.

### Espace admin restaurant (mobile)

- **Accueil :** recettes, plats vendus, satisfaction, crédits, retraits, graphiques et prévisions par jour, semaine ou mois.
- **Service :** appel par plat ou par table, variantes par ingrédients retirés, lot allergie séparé, signalements et QR code.
- **Menus :** catalogue de plats, menu de chaque jour, **nombre de plats disponibles** et publication.
- **Stocks :** ingrédients, recettes, achats, consommation et inventaire hebdomadaire.
- **Profil :** avis, rapport exportable en Excel, heure limite, prix des offres et règles de crédit.

### Console web

- Tableau de bord : KPI par jour, semaine ou mois, recettes, dépenses, plats vendus et indicateurs de stock.
- Utilisateurs : création des élèves et parents, réinitialisation des mots de passe, liens parent ↔ élève.

## Installation

Prérequis : **Node.js 20 ou plus récent** et l'application **Expo Go** sur le téléphone, ou un émulateur.

### Application mobile

```bash
npm install
npx expo start --offline
```

Scanner ensuite le QR code avec Expo Go (Android) ou l'appareil photo (iPhone). Si le téléphone et l'ordinateur ne sont pas sur le même réseau :

```bash
npx expo start --tunnel
```

### Console web

```bash
cd web-admin
npm install
npm run dev
```

La console s'ouvre sur http://localhost:5173. Pour construire la version de production :

```bash
npm run build
```

### Vérifications

```bash
npm run typecheck
npm run lint
npm test
```

Pour ajouter une dépendance à l'application mobile, utiliser `npx expo install <paquet>`.

## Structure du projet

```text
src/
  app/
    (tabs)/       Espace élève : accueil, commandes, favoris, profil
    (parent)/     Espace parent : accueil, historique, compte
    (admin)/      Espace admin : accueil, service, menus, stocks, profil
    dish/[id].tsx Fiche d'un plat
    *.tsx         Connexion, recharge, scan, réglages et autres écrans
  components/     Composants communs (cartes, onglets, wallet, offres, prix)
  lib/            Thème, textes FR/EN, règles pures, données, photos, rapport
  store/
    app.ts        État élève et parent
    admin.ts      État admin
web-admin/        Console web
supabase/
  migrations/     Schéma, règles métier et sécurité
  functions/      create-payment, jeko-webhook, manage-users
tests/            Tests des règles métier
docs/             Spécifications
assets/dishes/    Photos des plats et crédits
```

## Backend

- **Projet Supabase :** `vatel` (`mquoiwpgtjrvdicwghdx`), région `eu-west-1`.
- **Source de vérité :** les opérations sensibles (commande, débit, crédit, remboursement, quotas, offres, retrait) sont exécutées par des fonctions SQL. L'application ne peut pas les contourner.
- **Connexion :** l'identifiant devient `<identifiant en minuscules>@vatel.local` dans Supabase Auth.
- **Temps réel :** les commandes, appels, signalements et notifications se mettent à jour automatiquement.

### Fonctions Edge

| Fonction | Rôle |
| --- | --- |
| `create-payment` | Crée une demande de paiement Jèko pour une recharge ou une offre |
| `jeko-webhook` | Vérifie la signature de Jèko, puis crédite le wallet ou active l'offre une seule fois |
| `manage-users` | Crée et gère les comptes, réservée aux administrateurs |

### Secrets

Les clés Jèko ne sont jamais dans le code. Elles sont enregistrées dans les secrets des fonctions Edge :

```text
JEKO_API_KEY
JEKO_API_KEY_ID
JEKO_STORE_ID
JEKO_WEBHOOK_SECRET
```

Adresse du webhook à déclarer chez Jèko :

```text
https://mquoiwpgtjrvdicwghdx.supabase.co/functions/v1/jeko-webhook
```

## Sécurité

- Row Level Security sur les tables : chaque utilisateur n'accède qu'à ce que son rôle autorise.
- Fonctions SQL sensibles avec contrôle de l'identité et du rôle.
- Verrouillage à la commande : deux élèves ne peuvent pas obtenir la dernière portion.
- Webhook protégé par signature HMAC-SHA256, comparée en temps constant.
- Prix des offres relus dans la base, jamais repris du téléphone.
