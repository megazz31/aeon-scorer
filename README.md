# Aeon Scorer v3 — Calibrated Power Distribution

Aeon Scorer estime la **distribution de puissance d'un deck Commander**. Il ne cherche plus à convertir une somme de cartes en bracket.

## Modèle

1. **Card primitives** — fonctions détectées dans le texte Oracle : mana, tutor, interaction, protection, récursion, tokens, etc.
2. **Package graph** — détection de sous-systèmes producteurs/payoffs : early commander, Blink/ETB, Constellation, tokens, sacrifice, cimetière, marqueurs…
3. **Sequence Monte Carlo** — simulation d'accès au mana, commandant, moteur, interaction, rebuild et explosivité jusqu'à T7.
4. **Power distribution** — médiane, P20, P80, variance, consistance et dimensions.
5. **AeonShift prior** — signal externe optionnel et volontairement faible ; jamais une vérité Commander.

Le moteur ne simule pas une partie complète de Magic : sans moteur de règles, stack, cibles, choix politiques et trois adversaires, cela donnerait une fausse précision.

## Calibration v3

Corpus final : **38 listes réelles**.

- 15 précons Commander officiels ;
- 15 listes cEDH établies ;
- 8 listes personnelles/publices Archidekt utilisées comme cohorte intermédiaire non ancre.

Dernier run : **12/12 gates de qualité**.

Repères observés sur ce corpus :

- précons : médiane **49** ;
- cohorte personnelle/public : médiane **57** ;
- cEDH : médiane **78** ;
- séparation précon/cEDH : **AUC 1.000** ;
- écart médian : **29 points** ;
- stabilité des reruns : **0 point d'écart** sur le sous-échantillon testé.

Ces valeurs sont des **repères de calibration, pas des seuils**. `49` ne signifie pas « précon tier », pas plus que `78` ne signifie automatiquement « cEDH ». Le profil complet et la variance restent plus importants qu'un nombre isolé.

## Gates mesurés

Le benchmark vérifie notamment :

- taille et diversité du corpus ;
- séparation globale et holdout ;
- stabilité Monte Carlo ;
- sensibilité au fast mana ;
- sensibilité aux tutors ;
- dépendance au commandant ;
- échelle sémantique ;
- précision des packages ;
- cohorte intermédiaire non entraînée ;
- signal combo.

`12/12` signifie que **ces tests internes passent**. Ce n'est pas une preuve que le modèle est universellement parfait ; le corpus doit continuer à grandir.

## Installation

```bash
npm install
npm run dev
```

Vérifications locales :

```bash
npm run smoke
npm run build
```

Benchmark complet (accès Internet requis pour les sources publiques / Scryfall) :

```bash
npm run benchmark
npm run validate:calibration
```

## Utilisation

- coller une decklist `1 Card Name` ;
- indiquer le commandant ;
- choisir 1 500 / 3 000 / 6 000 séquences ;
- optionnel : importer le CSV AeonShift courant ;
- lire **médiane + plancher + plafond + variance + dimensions + packages**, pas seulement la médiane.

## Limites connues

- pas de moteur de règles Magic complet ;
- mana colorée encore simplifiée ;
- base de combos haute confiance volontairement petite ;
- les tutors augmentent l'accès mais leurs cibles ne sont pas encore résolues dynamiquement ;
- les interactions adverses ne sont pas encore simulées comme des scénarios complets ;
- AeonShift reste contextuel à son propre système de points.

## Priorités v4

- mana colorée et fenêtres de paiement exactes ;
- graphe tutor → cible → package ;
- scénarios commandant neutralisé / post-wipe / moteur retiré ;
- élargissement continu du corpus de calibration ;
- calibration sur données de parties réelles lorsque disponibles.
