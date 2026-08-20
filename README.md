# Aeon Scorer v3.1 — Semantic Hardening

Aeon Scorer estime la **distribution de puissance structurelle d'un deck Commander**. Il ne cherche pas à convertir une somme de cartes en bracket.

> La v3.1 est en validation. Elle ne doit être marquée comme validée que lorsque le même commit final passe l'intégralité de la chaîne CI et la revue manuelle finale.

## Modèle

1. **Card primitives** — fonctions détectées dans le texte Oracle : mana, tutor, interaction, protection, récursion, tokens, etc.
2. **Package graph** — sous-systèmes producteurs/payoffs : early commander, Blink/ETB, Constellation, tokens, sacrifice, cimetière, marqueurs…
3. **Monte Carlo d'accès** — accès probable au mana, commandant, package opérationnel, interaction, ressource et burst jusqu'à T7.
4. **Power distribution** — médiane, P20, P80, pic, dispersion, consistance et dimensions.
5. **AeonShift prior** — signal externe optionnel et volontairement faible ; jamais une vérité Commander.

Le moteur ne simule pas une partie complète de Magic. Les colonnes d'accès sont évaluées indépendamment : elles ne prétendent pas qu'on peut tout faire simultanément dans une même ligne de jeu.

## Ce que v3.1 corrige

- reminder text exclu des rôles fonctionnels ;
- séparation type de carte / mot simplement cité dans Oracle ;
- Blink propre ≠ removal ;
- producteurs et payoffs affichés séparément et dédupliqués ;
- marqueurs, doubles tokens et doubles triggers séparés ;
- `fast-mana` et `burst-mana` séparés ;
- fenêtres de mana colorée plus réalistes ;
- conditions spécifiques de LED, Chrome Mox, Mox Diamond, Mox Opal et Mox Amber ;
- sorts de ramp non permanents non conservés artificiellement sur le battlefield interne ;
- parser Sideboard / Maybeboard / Considering ;
- résolution Scryfall exacte puis fuzzy conservatrice ;
- garde-fous identité couleur et copie du commandant dans l'interface ;
- labels de reprise/disruption rendus moins trompeurs.

## Protocole de validation v3.1

Le même head final doit passer :

```text
smoke
micro-sémantique
métamorphique
audit adversarial
build production
benchmark macro 1 800
validation étendue
benchmark macro 3 200
validation étendue
convergence 1 800 ↔ 3 200
revue manuelle finale
```

Le benchmark contient au minimum 30 listes réelles. La sélection v3.1 est stratifiée pour ne pas utiliser seulement d'anciens précons et cherche aussi à diversifier les commandants cEDH.

Les anciennes valeurs v3 (38 decks, précons ~49 / cohorte perso ~57 / cEDH ~78) restent uniquement des **repères historiques** tant que le rapport v3.1 final n'est pas passé.

## Installation

```bash
npm install
npm run dev
```

Vérifications locales rapides :

```bash
npm run smoke
npm run test:semantic
npm run test:metamorphic
npm run audit
npm run build
```

Benchmark réseau complet :

```bash
npm run benchmark
npm run validate:calibration
```

## Utilisation

- coller une decklist `1 Card Name` ;
- indiquer le commandant ;
- choisir 1 500 / 3 000 / 6 000 séquences ;
- optionnel : importer le CSV AeonShift courant ;
- lire **médiane + P20 + P80 + pic + dispersion + dimensions + packages**, pas seulement la médiane.

La v3.1 supporte actuellement **un seul commandant**. Les configurations Partner / Friends Forever / Background à deux commandants ne sont pas encore modélisées.

## Limites connues

- pas de moteur de règles Magic complet ;
- les tuteurs sont détectés mais leurs cibles ne sont pas exécutées dynamiquement ;
- la pioche est mesurée comme capacité accessible mais n'est pas encore propagée comme de nouvelles cartes dans toutes les séquences futures ;
- les coûts alternatifs contextuels comme Force of Will/Fierce Guardianship ne sont pas encore planifiés complètement ;
- symboles hybrides/phyrexians et certaines capacités de mana spéciales restent approximatifs ;
- base de combos haute confiance volontairement petite et **non exhaustive** ;
- « options de reprise » n'est pas une simulation complète d'un wipe ;
- politique multijoueur, stack réelle, cibles et décisions adverses ne sont pas simulées ;
- AeonShift reste contextuel à son propre système de points.

## Priorités après v3.1

- graphe tutor → cible → package ;
- propagation réelle de la pioche ;
- solveur complet des coûts alternatifs/spéciaux ;
- scénarios commandant neutralisé / post-wipe / moteur retiré / graveyard hate ;
- support multi-commandants ;
- élargissement du corpus et données de parties réelles.
