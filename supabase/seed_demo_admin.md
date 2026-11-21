# Données de démonstration pour l'administration (enregistrées dans la base le 21 novembre 2026)

Ces données ont été créées directement dans la base (pas par une migration) pour remplir le tableau de bord, le service, les stocks et les avis.
À supprimer avec les autres éléments de démonstration avant la production.

## Comptes
- **18 élèves** : `VAT-24-0501` à `VAT-24-0518` (mot de passe de départ : celui des autres comptes de test, voir `migrations/0003_seed.sql`, à changer à la première connexion).
- **8 parents** : `parent.traore`, `parent.sanogo`, `parent.diallo`, `parent.nguessan`, `parent.coulibaly`, `parent.bamba`, `parent.kone`, `parent.aka` (les deux premiers ont deux enfants).
- Avec `VAT-24-0412`, `VAT-24-0413` et `parent.koffi` : 20 élèves et 9 parents au total.

## Historique (5 au 20 novembre et octobre)
- Environ 800 commandes reçues sur 7 semaines, avec 480 avis 👍/👎 et 69 commentaires ; recharges hebdomadaires égales aux dépenses.
- 6 abonnés à l'offre annuelle, 4 élèves en dette (plats à crédit), 6 élèves avec allergies (cases et saisie libre).

## Commandes à venir
- 36 commandes pour lundi 23 et mardi 24 novembre, avec variantes (« sans oignon », « sans piment »…) : de quoi remplir l'écran Service, les variantes colorées et le lot allergie.

## Signalements
- 6 signalements « plat non reçu » (dont 3 à traiter et 3 remboursés).

## Stocks
- 70 achats (environ 340 000 F), 70 sorties de consommation sur 7 semaines, 6 inventaires validés.

Pour tout effacer : supprimer les comptes `VAT-24-05xx` et `parent.*` (hors `parent.koffi`) dans l'espace Utilisateurs de la console web ou dans la table `profiles` (les données liées partent avec), puis vider `purchases`, `usages` et `inventory_weeks`.
