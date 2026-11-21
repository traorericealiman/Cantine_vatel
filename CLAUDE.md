@AGENTS.md

# Cantine de Vatel : application mobile élève / employé, parent et administrateur

Application de cantine (commande, wallet, plats favoris) en React Native avec Expo SDK 58, expo-router, zustand et TypeScript.
Les spécifications complètes (3 rôles : élève/employé, parent, administrateur) sont dans le doc partagé : https://claude.ai/artifact/GrvPNk7dedsniCyKGEUzow
**Les trois espaces sont construits** et branchés à la base : élève/employé, parent et administrateur.

## Lancer et vérifier

```bash
npx expo start --offline   # téléphone (Expo Go) ; --offline évite la vérification réseau trop lente
npx expo start --web       # aperçu navigateur (taille téléphone : 375x812)
npx tsc --noEmit           # types : à lancer avant de dire qu'une tâche est finie
```

Comptes : voir `supabase/migrations/0003_seed.sql` (identifiants `VAT-24-0412` élève, `parent.koffi` parent, `admin`) ; les pastilles de connexion rapide ont été retirées de `login.tsx`.
- Un nouveau mot de passe est demandé à la première connexion (mot de passe provisoire).

## État historique (premières versions : front seul, données fictives)

> Cette section décrit les premières versions. L'app est maintenant branchée à Supabase et à Jèko : voir « Backend Supabase et Jèko » plus bas et le `README.md`. La commande automatique et le chatbot ont été retirés : les favoris proposent une commande à confirmer (`rules`, `proposals`, `addFavorite`, `setFavoriteMode`).

- Tout vit en mémoire dans `src/store/app.ts` (zustand) : solde, commandes, favoris (`rules`), propositions, opérations. Rien n'est persisté.
- Le dépôt GitHub privé est `traorericealiman/cantine-vatel` (branche `main`). Ne pousser que sur demande de l'utilisateur.
- Les spécifications exportées en PDF sont dans `docs/Specifications-Cantine-de-Vatel.pdf` (elles ne contiennent pas les décisions prises ensuite, listées ici).
- **Rien n'est branché** à Supabase (le projet `vatel` existe, région eu-west-1, base vide), ni au paiement (une API de paiement type Jeko est prévue, à confirmer avec l'utilisateur ; `src/app/recharge.tsx` simule la recharge).
- **Plus d'assistant IA** (retiré à la demande de l'utilisateur). À la place, l'onglet **Favoris** : on ajoute des plats préférés (cœur sur la fiche du plat), et « Commander pour moi » crée une proposition à confirmer dès que le plat est au menu (`rules`, `proposals`, `toggleRule`, `addFavorite` dans le store). Jamais de commande sans confirmation. Le code `chat()` du store n'est plus utilisé par l'interface.
- Pas de bannière de notification en haut de l'écran : les notifications passent par la cloche.
- Les menus, plats et prix sont dans `src/lib/data.ts`. Les photos sont dans `assets/dishes/` (Wikimedia Commons, licences libres) ; les crédits (auteurs, licences) sont dans `src/lib/credits.ts`. L'utilisateur a demandé de **ne pas afficher de page de crédits dans l'app** ; attention, les licences CC BY / CC BY-SA exigent une attribution si l'app est publiée.

## Structure

```
src/app/            écrans (expo-router) ; welcome.tsx = écran d'accueil plein écran (photo du Garba, « Commencer ») ;
                    login.tsx = connexion sombre (photo en haut, champs translucides, matricule + mot de passe) ;
                    (tabs)/ = Accueil, Commandes, Favoris (bouton rond central), Profil
src/app/(parent)/   espace parent, 3 onglets : overview (accueil), activity (historique), account (profil) ;
                    parent-recharge.tsx (modale) et parent-alerts.tsx (seuil de solde bas) sont à la racine de src/app/
src/components/     TabBar.tsx (barre flottante commune élève/parent), ChildPicker.tsx (pastilles des enfants), ui.tsx (T, Button, Card, Field, Chip, Segmented, LangPill, DishTile…), fx.tsx (Reveal, Tap, Backdrop,
                    useCountUp), WalletCard.tsx, notifications.tsx (cloche, bouton profil ; TurnBanner existe mais n'est plus affichée),
                    icons.tsx (SVG : œil, cœur), TxRow.tsx
src/lib/            data.ts (plats, menus, règles de dates), i18n.ts (FR/EN), theme.ts, images.ts, credits.ts
src/store/app.ts    état global (appels à la base, mises à jour optimistes)
src/lib/rules.ts    règles pures testées (recharge, crédit d'urgence, allergies, catégories) ; src/lib/types.ts : types partagés ; tests/ : `npm test`
```

Les écrans hors onglets (fiche du plat `dish/[id]`, `recharge`, `allergies`, `feedback`, `history`, `notifications`, `faq`, `password`). Les écrans `assistant`, `rules` et `credits` ont été supprimés sont déclarés dans `src/app/_layout.tsx`.

## Espace parent (section 7 des spécifications)

- Le rôle est dans le store (`role: 'student' | 'parent'`), fixé à la connexion ; les layouts `(tabs)` et `(parent)` redirigent l'autre rôle. `user` désigne l'utilisateur connecté, quel que soit son rôle.
- Données par enfant : `CHILDREN` et `AYA_ID` (store). Aya partage les champs de premier niveau du store (solde, dette, commandes, `txs`) avec l'espace élève ; les autres enfants sont dans `siblings`. Toujours lire un enfant avec `useChildWallet(id)`, jamais en copiant des champs. `WalletCard` accepte `childId`.
- Accueil : sélecteur d'enfant (si plusieurs), carte wallet, bandeau « Solde bas » sous le seuil du parent, offre annuelle, repas à venir en lecture seule. **Le parent ne commande jamais à la place de l'enfant.**
- Historique : onglets Repas (plat, date, prix payé, Reçu / À venir / Non confirmé) et Wallet (mêmes lignes `TxRow` que l'élève).
- Recharge (`rechargeChild`, fonction pure `topup`) : la dette de l'enfant est déduite en premier, comme côté élève. Onglet « Offres » : abonnement annuel (`PROMO` dans `data.ts`).
- Alertes : seuil modifiable (`lowThreshold`, 2 000 F par défaut, partagé avec l'élève) ; notifications déduites de l'état (solde bas, plat à crédit tant que la dette court). La cloche et `useNotifications` dépendent du rôle.
- Le parent est vouvoyé dans ses écrans (textes `p…` de `i18n.ts`) ; l'élève reste tutoyé. Éviter « de {name} » dans les textes (élision : « d'Aya »).
- Le parent peut évaluer l'application (👍/👎 + recommandation libre) depuis Profil, via `feedback.tsx` partagé ; son vote est séparé de celui de l'élève (`parentAppVote`).
- Pas de chatbot ni de favoris côté parent. FAQ propre au parent (`PARENT_FAQ`).
- **À confirmer** : le prix de l'abonnement (`PROMO.fee` = 20 000 F, valeur de démonstration) ; l'abonnement ne baisse pas encore le prix côté élève (phase 3 : grilles tarifaires) ; l'abonnement ne recharge pas le wallet ; SMS pour les parents sans email (question ouverte des spécifications).

## Espace administrateur (section 8 des spécifications)

- Rôle `admin` (identifiant `admin`) ; groupe `src/app/(admin)/` avec 4 onglets texte (`TabBar`, sans bouton central) : `dashboard` (Accueil), `service`, `menus`, `stocks`. Les layouts `(tabs)` et `(parent)` redirigent l'admin, et inversement.
- Écrans hors onglets : `admin-account` (via l'icône profil : avis, rapport, utilisateurs, règles, déconnexion), `admin-reviews`, `admin-report` (export PDF simulé), `admin-inventory` (modale).
- Données et actions dans **`src/store/admin.ts`** (store séparé, zustand) : `KPI`, `REVENUE` (jour/semaine/mois), `todayOrders`, ingrédients, inventaire, signalements, menus remplacés par emplacement (`slotKey`, `adminMenu`), publication. Tout est fictif mais stable.
- Composants propres : `src/components/admin.tsx` (`AdminHeader`, `StatCard`, `BarChart` sans bibliothèque, `Progress`, `Section`) et `src/lib/format.ts` (`compact`, `signedPct`).
- Tableau de bord : sélecteur **Jour / Semaine / Mois** qui pilote recettes, plats vendus, satisfaction et plat le plus aimé (`PERIOD_KPI`) ; graphique recettes ou plats vendus ; prévisions ; rapport.
- **Retrait par QR code unique** : l'admin affiche (et peut régénérer) un seul QR code au comptoir (`admin-qr.tsx`, `qrToken`, `react-native-qrcode-svg`). L'élève touche « Scanner pour valider mon retrait » (`scan.tsx`, `expo-camera`) : tous ses plats du jour passent en « Reçu » (en attente de synchronisation hors connexion) et sont comptés côté admin (`registerPickup`). **Plus de bouton « Servir » ni « J'ai reçu mon plat ».** Un lien « Simuler le scan (test) » existe en développement/web, à retirer avant la production. Ceci remplace la règle « pas de QR code » plus bas.
- Service : mode « Appel par plat » (Appeler) ou « Tables » où **l'admin choisit la table (A–F) de chaque plat** (`setTable`) ; progression = retraits scannés ; signalements.
- Menus : **catalogue de plats enregistrés** (`admin-dishes.tsx`, ajout via `admin-dish-new.tsx`, `catalog`/`addDish`) ; chaque jour, « Remplacer » propose les plats du catalogue, puis « Publier le menu ». Pas encore relié aux menus vus par les élèves.
- Stocks : niveau par ingrédient ; inventaire en deux journaux, **Achats** et **Consommation** (`admin-usage.tsx`, `usages`/`addUsage` : ce que la cuisine a utilisé, le stock baisse) ; **journal des achats** (`admin-inventory.tsx`, ajout via `admin-purchase.tsx`) : produit, quantité, unité, montant, fournisseur, plats concernés, remarque ; l'achat augmente le stock ; « Valider l'inventaire de la semaine ».
- Rapport (`admin-report.tsx`) détaillé (évolution, ventes, plats, stock et pertes, crédits, incidents, semaine prochaine) et **export Excel** (`src/lib/report.ts`, bibliothèque `xlsx` ; téléchargement sur le web, partage via `expo-file-system` + `expo-sharing` sur téléphone ; 6 feuilles).
- Plat sans avis (`votes === 0`, ex. `kedjenou` au menu du mardi) : badge « Nouveau » dans le menu élève et les recommandations, et « Pas encore d'avis » sur la fiche, au lieu d'un pourcentage.
- **Réglages** (`admin-settings.tsx`, depuis le compte admin ou le bandeau « Commandes ouvertes jusqu'à… » de Service, avec « +30 min ») : l'admin fixe l'**heure limite de commande** (pas de 15 min, entre 7 h et 14 h) et le **prix de l'offre annuelle** (prix du plat abonné, prix de l'abonnement). Ils sont écrits dans les objets partagés `SETTINGS` et `PROMO` de `data.ts` : `isOpen` et l'écran parent les lisent. Dans les textes, `{time}` est remplacé automatiquement par l'heure limite (`translate`, `cutoffLabel`). Rien n'est persisté.
- Textes admin : clés `a…` dans `i18n.ts`.

## Règles métier déjà implémentées (ne pas casser)

- Commandes ouvertes jusqu'à l'heure limite réglée par l'admin, 10 h par défaut (`SETTINGS.cutoff`) ; un jour passé affiche seulement « Jour passé ».
- **Un seul plat par catégorie et par jour** : une entrée, un plat de résistance, un dessert (`categoryTaken` dans le store).
- Commander **débite le solde tout de suite**, après une étape de confirmation (fiche du plat et recharge). Annuler avant 10 h rembourse.
- **Crédit d'urgence** : 3 plats à crédit maximum, le 1er au prix normal, les 2 suivants +10 % (« frais de dépannage », jamais « taxe »). La recharge rembourse la dette en premier (`simulate`, `recharge`).
- Retrait **confirmé par l'élève** (« J'ai reçu mon plat »), mis en attente de synchronisation si hors connexion. Pas de QR code, pas de scan.
- Deux modes de service : plusieurs services → tables (une table = un plat) ; un seul service → appel par plat. L'admin choisit ; ici c'est simulé dans `serviceFor` et `called`.
- Avis sur les plats en 👍 / 👎 (pas d'étoiles) ; retoucher le même pouce retire l'avis.
- Allergies : demandées à la première connexion, modifiables dans le Profil, plus saisie libre (`allergyHits`). Un plat concerné n'est jamais recommandé et affiche un avertissement.
- Langue : détectée au téléphone (anglais sinon français), pastille FR | EN en haut des écrans.

## Design actuel (validé par l'utilisateur)

- Ordre d'ouverture : `welcome` → `login` → (première connexion : `first-login` puis `allergies`) → onglets.
- Accueil connecté : en haut la pastille FR | EN, la cloche et l'icône profil (pas de « Bonjour » ni de nom de l'app) ; carte wallet bleu nuit compacte (solde, œil pour masquer, « + » blanc pour recharger) ; « À confirmer » ; recommandations en grandes cartes photo (texte blanc sur dégradé) ; menu de la semaine. Les dernières opérations sont dans Profil › Historique.
- Fiche du plat : grande photo, cœur favori en haut à droite, composition à cocher, total + « Commander » puis étape de confirmation. Pas de choix de jours (on commande pour le jour d'où l'on vient).
- Commandes : onglets En cours / Terminé lisibles (actif plein, texte contrasté), classées par jour.
- Photos réelles partout où elles existent (`DishTile`, `DishPhoto`) ; emoji seulement en secours.

## Conventions

- **Textes** : jamais en dur dans les écrans. Ajouter la clé dans `fr` ET `en` de `src/lib/i18n.ts` ; le type `Key` fait échouer `tsc` si l'une manque. Utiliser `useI18n()`.
- **Couleurs** : **fond blanc**, bleu nuit `#0F172A` seulement en accent (`colors.brand` : boutons, onglet actif, jour choisi, carte du wallet, bouton central) avec texte blanc dessus (`colors.onBrand`). **Pas de bleu clair, pas de fond bleu nuit** sauf les écrans d'avant connexion (`welcome.tsx`, `login.tsx`), qui sont sombres et immersifs (`colors.night`, photo en haut qui se fond dans le sombre). Tout est dans `src/lib/theme.ts`. Le jaune, le bleu vif et le thème entièrement sombre ont été essayés puis refusés. Sur un fond `colors.brand`, toujours écrire en `colors.onBrand`.
- **Polices** : police système sur iOS (SF Pro), Inter sur Android ; toujours passer par le composant `T` ou `font()`.
- **Style voulu par l'utilisateur** : épuré, très simple à utiliser, « pro », pas d'effet « généré par IA ». Pas de bulles décoratives, pas d'icônes superflues (barre d'onglets en texte). Contraste net : texte blanc sur fond bleu, noir sur fond blanc.
- **Retours** : simple flèche, jamais de titre du type « Accueil » (`headerBackButtonDisplayMode: 'minimal'`).
- Les icônes nécessaires (œil, cœur, cloche, profil) sont dessinées avec `react-native-svg` ou des formes simples ; pas de bibliothèque d'icônes.
- Installer les dépendances avec `npx expo install`, jamais `npm install` directement.

## Pièges connus

- Les composants `Tap` appliquent les propriétés de mise en page (`flex`, `width`, marges) au conteneur tactile ; garder ce comportement.
- La barre d'onglets personnalisée navigue avec `router.navigate`, pas avec l'objet `navigation` (absent dans cette version d'expo-router).
- `outlineStyle` n'existe que sur le web : utiliser `...noOutline` du thème pour les champs de saisie.
- Wikimedia limite fortement les téléchargements (HTTP 429 avec `Retry-After` de 600 s). Si on remplace les photos : tailles de miniatures standard (500 px), requêtes espacées, jamais de lien direct depuis l'app.
- L'aperçu navigateur perd son état à chaque rechargement (tout est en mémoire) : se reconnecter après un rafraîchissement.

## Backend Supabase et Jèko (branché)

- Projet Supabase `vatel` (`mquoiwpgtjrvdicwghdx`). Migrations dans `supabase/migrations/` (0001 schéma, 0002 règles métier en RPC, 0003 données de départ, 0004 verrouillage des fonctions, 0005 recharge démo, 0006 QR privé + abonnement démo). Les mots de passe des comptes par défaut sont dans 0003_seed.sql.
- Connexion réelle : identifiant → `<identifiant en minuscules>@vatel.local` (`src/lib/supabase.ts`). Le store `src/store/app.ts` garde l'état local (mises à jour optimistes) puis rappelle `refresh()` pour recopier l'état du serveur. Menus, solde, commandes, favoris, propositions, allergies, avis et QR viennent de la base.
- Espace élève et parent : branchés. Espace admin : entièrement branché sur la base via `src/store/admin.ts` (`loadAll` à l'ouverture puis toutes les 30 s) : plats, menus (brouillon / publication), service du jour, QR code, réglages, stocks, achats, consommation, inventaire, avis, rapport Excel. Chiffres du tableau de bord et prévisions : fonction SQL `admin_dashboard` (migration 0012).
- Paiement : fonctions Edge `create-payment` et `jeko-webhook` (`supabase/functions/`). Secrets : JEKO_API_KEY, JEKO_API_KEY_ID, JEKO_STORE_ID, JEKO_WEBHOOK_SECRET (le dernier reste à créer après l'enregistrement du webhook dans Jèko). Webhook : https://mquoiwpgtjrvdicwghdx.supabase.co/functions/v1/jeko-webhook.
- À retirer avant la production : fonctions `demo_topup` / `demo_subscribe`, lien « Recharge de démonstration », pastilles de comptes de test sur la connexion.
- Notifications push : migration 0009 (envois par la base via pg_net vers le service Expo : plat appelé, solde bas, paiement reçu) et `src/lib/push.ts` (autorisation + jeton à la connexion). Décision (première version) : pas de notifications push sur le téléphone, seulement la cloche dans l'app ; le projet EAS `cantine-vatel` est créé et lié (app.json), sans build ni Firebase. Pour réactiver plus tard : google-services.json + clé FCM dans EAS + build de développement. Les envois à distance demandent une « development build » EAS et un `extra.eas.projectId` dans app.json ; sans cela l'app ignore l'étape sans erreur (Expo Go ne suffit pas).
- Pas encore fait : prévisions d'achat, admin entièrement relié à la base, protection des mots de passe divulgués (réglage Auth Supabase).

- Plats : la liste vient de la table `dishes` (chargée dans `DISHES` par `loadGlobal`) ; les photos restent locales (`src/lib/images.ts`), un plat sans photo affiche son emoji. Cloche : lit la table `notifications` (migrations 0009 et 0011, écrite par des triggers : plat appelé, solde bas, paiement, proposition, plat à crédit), mise à jour en direct. Recommandations : score d'après commandes, avis, favoris, ingrédients aimés, allergies exclues (`Recommendations` dans `(tabs)/index.tsx`).

## Administration générale (web)

- Dossier `web-admin/` : application web React (Vite) séparée de l'app mobile. Lancer : `cd web-admin && npm run dev` (http://localhost:5173) ; construire : `npm run build`.
- Connexion avec le compte `admin` (rôle admin). Tableau de bord : KPI jour / semaine / mois, graphiques recettes-dépenses et plats vendus, indicateurs de stock en lecture seule (pas de saisie de stock, pas de prévisions). Utilisateurs : créer élèves et parents (identifiant + mot de passe par défaut), réinitialiser un mot de passe, lier parents et élèves.
- Les comptes sont créés par la fonction Edge `manage-users` (`supabase/functions/manage-users`, clé de service, réservée au rôle admin). Les données KPI viennent de la fonction SQL `admin_dashboard` et de lectures directes protégées par les règles de sécurité.

- Service (cuisine) : chaque plat est décomposé en **variantes** (ingrédients retirés) avec une couleur par variante (`VARIANT_COLORS`, repère bol ou ticket) et un **lot allergie** séparé (élèves ayant des allergies déclarées, `ALLERGY_COLOR`) ; calculés dans `loadService` / `dayRows` (`src/store/admin.ts`), affichés dans `(admin)/service.tsx`.
