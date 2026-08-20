# Aeon Scorer v3.1 — Semantic Hardening

Aeon Scorer estime la **distribution de puissance structurelle d'un deck Commander**. Il ne cherche pas à convertir une somme de cartes en bracket.

La v3.1 a passé sur le même head final : micro-sémantique, métamorphique, audit adversarial, build, benchmarks 1 800 / 3 200 et convergence.

## Lecture principale

Le résumé est volontairement centré sur quatre valeurs :

- **Puissance médiane** — niveau habituel estimé du deck ;
- **P20** — sortie basse plausible ;
- **P80** — bonne sortie plausible ;
- **Pic** — haut de potentiel accessible, distinct de la sortie habituelle.

Les dimensions, packages, drivers, courbe T1–T7, dépendance au commandant et couverture des données sont regroupés dans **Diagnostic détaillé**. Ils expliquent le score mais ne remplacent pas les quatre valeurs principales.

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

## Lancement Windows recommandé

Après un `git pull`, tu peux simplement **double-cliquer sur `AeonScorer.cmd`** à la racine du projet.

Le menu propose :

1. **Lancer Aeon Scorer** — installe les dépendances seulement si nécessaire puis démarre le site ;
2. **Mettre à jour + vérifier + lancer** — `git pull --ff-only`, dépendances, tous les contrôles locaux, puis démarrage ;
3. **Vérifier le projet uniquement** — smoke + sémantique + métamorphique + audit + build ;
4. **Benchmark complet** — validation réseau longue du corpus.

Le lanceur PowerShell sous-jacent est `AeonScorer.ps1`. Il peut aussi être appelé directement :

```powershell
.\AeonScorer.ps1 -Mode run
.\AeonScorer.ps1 -Mode update
.\AeonScorer.ps1 -Mode check
.\AeonScorer.ps1 -Mode benchmark
```

## Installation manuelle

Si tu préfères ne pas utiliser le lanceur :

```bash
npm install
npm run dev
```

Tous les contrôles locaux en une commande :

```bash
npm run quality:local
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
- comparer d'abord **médiane + P20 + P80 + pic** ;
- ouvrir **Diagnostic détaillé** seulement pour comprendre l'origine du résultat ou examiner un cas suspect.

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
