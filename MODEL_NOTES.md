# Aeon Scorer v3 — notes du modèle

## Hypothèse centrale

`Puissance du deck ≠ somme des puissances individuelles des cartes.`

Une carte produit d'abord des **primitives**. Sa contribution dépend ensuite de ses packages, de sa fenêtre d'accès, du commandant, de la redondance et de la distribution des mains/séquences.

## Pourquoi un profil plutôt qu'un bracket

Deux decks peuvent avoir la même médiane et produire des expériences opposées :

- deck stable : plancher proche du plafond ;
- deck « fusée/tortue » : plafond très haut, plancher bas, variance élevée.

Le score principal doit donc toujours être accompagné de P20/P80, variance et consistance.

## Rôle d'AeonShift

Les points AeonShift constituent un **prior humain externe** utile : ils expriment un coût d'opportunité de construction dans leur format. Aeon Scorer n'en déduit jamais directement la puissance Commander d'un deck. Leur contribution au modèle reste faible et bornée.

## Packages

La détection exige une structure producteurs/payoffs suffisamment dense. Une simple présence de cartes du même type ne suffit plus. Cette correction a été introduite après que le prototype détectait des faux packages génériques, notamment un faux `Spellslinger` sur Hei Bai.

## Calibration

Le mapping final a été calibré sur 15 précons et 15 listes cEDH, puis contrôlé avec 8 listes Archidekt intermédiaires. Les listes personnelles n'ont pas servi d'ancres basses/hautes.

Dernier benchmark : 38 decks, 12/12 gates après validation étendue. Ce benchmark protège contre les régressions mais ne doit pas devenir une nouvelle doctrine : aucun quota universel de draw, removal, wipe ou ramp n'est introduit.

## Prochaine frontière technique

Le principal gain de précision attendu vient moins d'un nouveau coefficient global que de :

1. mana colorée réelle ;
2. résolution des cibles de tutor ;
3. relations package → package ;
4. scénarios de disruption ;
5. corpus de parties observées.
