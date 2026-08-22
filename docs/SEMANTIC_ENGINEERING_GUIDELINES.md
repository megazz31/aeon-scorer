# Guide d'Ingénierie Sémantique & Standards Aeon Scorer

Ce document définit les principes d'ingénierie, la table de vérité des règles MTG (Comprehensive Rules), le protocole d'immutabilité et les exigences de tests stricts pour le moteur d'évaluation **Aeon Scorer v3.2+**.

---

## 1. Protocole d'Immutabilité et Cycle de Versionnement

### Règle d'Or de la Reproductibilité
> **Une version sémantique publiée (ex: `3.2.0-semantic-9`, `3.2.0-semantic-10`) est strictement IMMUTABLE.**

1. **Interdiction de modifier le moteur sous une version existante** :
   - Tout changement dans `src/engine/cardFeatures.js`, `src/engine/packageGraph.js` ou `src/engine/powerModel.js` qui modifie un tag, un rôle, un motif de package ou un calcul de puissance **DOIT** faire l'objet d'un bump de version sémantique (ex: `3.2.0-semantic-9` → `3.2.0-semantic-10`).
2. **Cycle de promotion formel d'une version sémantique** :
   - **Étape 1 : Modification sémantique** (ajouts unitaires de mots-clés, motifs, tags).
   - **Étape 2 : Tests unitaires & de non-régression** (`scripts/*-semantic-test.mjs`, `scripts/keyword-counter-semantic-test.mjs`, `scripts/lifegain-semantic-test.mjs`).
   - **Étape 3 : Bump de version** dans `src/version.js` et alignement edge function dans `supabase/functions/record-analysis/index.ts`.
   - **Étape 4 : Audit de delta sémantique** (`node scripts/semantic-precon-delta.mjs`) pour vérifier l'impact sur le corpus.
   - **Étape 5 : Régénération du catalogue public** (`npm run precons:generate` avec synchronisation automatique de `docs/PUBLIC_PRECONS.md`).
   - **Étape 6 : Validation locale totale** (`npm run quality:local`).
   - **Étape 7 : Push / CI Run**.

---

## 2. Table de Vérité MTG (Comprehensive Rules Ground Truth)

Toute extraction de features dans `cardFeatures.js` doit respecter rigoureusement les règles MTG :

### A. Marqueurs et Mots-clés (`counterKinds` & `counterRoles`)
Les producteurs de marqueurs doivent être associés à leur type précis (`kind`) pour garantir la compatibilité dans `packageGraph.js` :

| Mot-clé / Mécanique | Action Sémantique | `counter-kind` | Notes MTG CR |
| :--- | :--- | :--- | :--- |
| **evolve** | Place un marqueur +1/+1 si créature plus grande entre | `plus1` | CR 702.99 |
| **adapt N** | Place N marqueurs +1/+1 si aucun marqueur | `plus1` | CR 702.138 |
| **amass [Subtype] N** | Crée une Armée ou place N marqueurs +1/+1 dessus | `plus1` | Produit aussi `tokens` (CR 702.137) |
| **support N** | Place un marqueur +1/+1 sur jusqu'à N autres créatures | `plus1` | CR 702.115 |
| **bolster N** | Place N marqueurs +1/+1 sur créature avec plus faible endurance | `plus1` | CR 702.107 |
| **graft N** | Entre avec N marqueurs +1/+1 et peut les transférer | `plus1` | CR 702.58 |
| **modular N** | Entre avec N marqueurs +1/+1 et les transfère à sa mort | `plus1` | CR 702.43 |
| **outlast [cost]** | S'engage pour placer un marqueur +1/+1 | `plus1` | CR 702.106 |
| **renown N** | Place N marqueurs +1/+1 quand inflige des blessures de combat | `plus1` | CR 702.111 |
| **backup N** | Place N marqueurs +1/+1 sur une créature ciblée | `plus1` | CR 702.165 |
| **monstrosity N** | Devient monstrueux et reçoit N marqueurs +1/+1 | `plus1` | CR 701.31 |
| **explore** | Révèle la carte du dessus : land en main ou marqueur +1/+1 | `plus1` | CR 701.40 |
| **connive** | Pioche/défausse et met +1/+1 si carte non-terrain défaussée | `plus1` | CR 701.47 |
| **fabricate N** | Met N marqueurs +1/+1 OU crée N servos 1/1 | `plus1` | Produit `counter-producer` & `tokens` (CR 702.123) |
| **riot** | Entre avec célérité OU un marqueur +1/+1 | `plus1` | CR 702.136 |
| **bloodthirst N** | Entre avec N marqueurs +1/+1 si blessures infligées | `plus1` | CR 702.54 |
| **undying** | Revient du cimetière avec un marqueur +1/+1 | `plus1` | CR 702.93 |
| **unleash** | Entre avec un marqueur +1/+1 et ne peut pas bloquer | `plus1` | CR 702.98 |
| **scavenge [cost]** | Exil du cimetière pour mettre des marqueurs +1/+1 | `plus1` | CR 702.97 |
| **training** | Met un marqueur +1/+1 si attaque avec créature plus forte | `plus1` | CR 702.149 |
| **mentor** | Met un marqueur +1/+1 sur attaquant avec force inférieure | `plus1` | CR 702.134 |
| **incubate N** | Crée un token Incubator avec N marqueurs +1/+1 | `plus1` | Produit `plus1` et `tokens` (CR 701.51) |
| **devour N** | Sacrifie des créatures et entre avec N*X marqueurs +1/+1 | `plus1` | CR 702.82 |
| **blight N** | Met N marqueurs -1/-1 | `minus1` | CR 702.180 (Lorwyn Eclipsed) |
| **persist** | Revient du cimetière avec un marqueur -1/-1 | `minus1` | CR 702.79 |
| **wither / infect** | Inflige des blessures sous forme de marqueurs -1/-1 | `minus1` | CR 702.80, 702.90 |

### B. Modélisation de `Modified` (CR 700.8)
Une créature est dite **Modifiée** si et seulement si elle remplit au moins une de ces conditions :
1. Elle a au moins un marqueur sur elle (de n'importe quel type).
2. Elle est équipée par un Équipement.
3. Elle est enchantée par une Aura contrôlée par son contrôleur.

**Directives d'implémentation** :
- Une carte qui récompense les créatures modifiées (ex: *Akki Battle Squad*, *Kodama of the West Tree*, *Chishiro, the Shattered Blade*) reçoit le tag `modified-payoff`.
- Dans le graphe de packages, `modified-payoff` est un payoff universel qui se satisfait d'une densité suffisante de **marqueurs** (`counters`), d'**équipements** (`equipment`) ou d'**auras** (`aura`).

### C. Causalité et Rôles de Points de Vie (`lifegain` vs `life-payoff`)
- **Producteur / Source de vie** (`lifegain`) :
  - Mot-clé `lifelink`.
  - Clauses d'effet direct : `"you gain N life"`, `"each player gains N life"`, `"target player gains N life"` (si contrôleur éligible).
  - *Exemples* : *Soul Warden*, *Swords to Plowshares*, *Aevitas*.
- **Observateur / Payoff** (`life-payoff`) :
  - Clauses de déclenchement : `"whenever you gain life"`, `"for each life you gained this turn"`, `"if you gained life"`.
  - **Interdiction formelle** : Un payoff de vie comme *Ajani's Pridemate* ou *Dina, Soul Steeper* **NE DOIT PAS** recevoir le tag `lifegain` source s'il ne produit pas lui-même de points de vie.
- **Remplacement / Multiplicateur** (`life-doubler`) :
  - `"if you would gain life, you gain twice that much life instead"` (*Boon Reflection*, *Beacon of Immortality*).

---

## 3. Normes de Tests Stricts (Zero Permissive Testing)

### A. Règle du Sentinel Test
Le script `scripts/sentinel-precons-test.mjs` sert de garde-fou ultra-rapide (< 4 secondes) sur 10 archétypes clés :
1. **Échec explicite sur fichier manquant** : Tout deck manquant doit déclencher immédiatement `assert.fail()`. Jamais de `console.warn` suivi de `continue`.
2. **Tolérance stochastique par rapport au snapshot attendu** :
   - La médiane à 400 itérations doit être comparée à la médiane du snapshot (3200 itérations).
   - Assertion : `Math.abs(actual.median - expected.median) <= 4.0`.
3. **Assertions de packages exhaustives** : Chaque archétype testé doit vérifier l'intégralité de ses packages signatures :
   - *Blood Rites* : `sacrifice` ET `lifegain`
   - *Explorers of the Deep* : `counters`
   - *Cavalry Charge* : `graveyard`
   - *Creative Energy* : `early-commander`
   - *Deep Clue Sea* : `tokens` ET `artifacts`
   - *Quick Draw* : `spells` (spellslinger)
   - *Mutant Menace* : `counters`
   - *Peace Offering* : `counters`

### B. Intégration CI Complète
Tout test de qualité locale doit être câblé dans le pipeline CI (`.github/workflows/generate-public-precons.yml` et `calibration.yml`). Aucun test ne doit être réservé à une exécution manuelle isolée.

---

## 4. Outils de Diff & Validation

Pour auditer un changement sémantique avant publication :
```bash
# 1. Valider la suite de tests sémantiques et unitaires
npm run test:semantic

# 2. Auditer l'impact sur les 10 archétypes sentinelles
npm run test:semantic:fast

# 3. Comparer les deltas de scores avant/après
node scripts/semantic-precon-delta.mjs

# 4. Exécuter la suite complète de qualité locale
npm run quality:local
```
