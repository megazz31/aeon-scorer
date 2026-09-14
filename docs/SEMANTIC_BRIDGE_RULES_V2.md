# Pont sémantique rules-v2 (MonSimulateur-MTG → aeon-scorer)

## Pourquoi

aeon-scorer dérive ses rôles fonctionnels d'**heuristiques de texte Oracle** (`src/engine/cardFeatures.js`).
MonSimulateur-MTG sait, aptitude par aptitude, si son **compilateur sémantique** a compilé
le texte en `exact` ou l'a refusé avec une **raison nommée**, et quels **effets** il a réellement compilés
(`src/rules-v2/compiler/semanticAbilityCompilerV3.js`, taxonomie `EFFECT_TYPE` de
`src/rules-v2/contracts/semanticSpecs.js`).

Le pont injecte cette sémantique compilée dans les primitives de rôle d'aeon-scorer, **uniquement là où
elle existe**, et laisse le repli heuristique partout ailleurs.

## Où vit la vérité

| Élément | Propriétaire | Fichier |
| --- | --- | --- |
| Grammaire, taxonomie d'effets, statut `exact`/refus, raisons de refus | MonSimulateur-MTG | `src/rules-v2/compiler/semanticAbilityCompilerV3.js`, `contracts/semanticSpecs.js` |
| Corpus de référence (12 decks) | MonSimulateur-MTG | `fixtures/rules-v2/archidekt-13.json` |
| Artefact par carte (dérivé, commité) | aeon-scorer | `semantic/rules-v2-card-semantics.json` |
| Table de traduction effet compilé → rôle aeon-scorer | aeon-scorer | `src/engine/rulesSemantics.js` |
| Corpus de mesure (dérivé, commité) | aeon-scorer | `semantic/corpus-archidekt-12.json` |

**Il n'y a jamais deux vérités.** L'artefact est une projection générée : il n'est pas édité à la main et
`npm run semantics:check` échoue s'il cesse d'être reproductible depuis le compilateur. La table de
traduction, elle, vit uniquement dans `src/engine/rulesSemantics.js` — c'est la seule chose qu'aeon-scorer
décide, et elle est défendue par `scripts/semantic-bridge-test.mjs`.

## Regénérer l'artefact (une commande)

```bash
# MonSimulateur-MTG doit être présent (dépôt frère, ou AEON_RULES_REPO=/chemin/vers/le/depot)
npm run semantics:export     # écrit semantic/rules-v2-card-semantics.json
npm run semantics:check      # échoue si l'artefact commité n'est plus reproductible
```

`scripts/export-rules-semantics.mjs` appelle la **même chaîne que le diagnostic du simulateur**
(`buildFinalAutomationCertification`, celle utilisée par `node scripts/rules-automation-final.js --json`),
puis relit les effets compilés via `compileSemanticAbilityV3`. Les empreintes SHA-256 du compilateur, de la
certification et du corpus sont enregistrées dans l'artefact (`source.*`).

Le corpus de mesure se régénère avec `npm run semantics:corpus` (réseau Scryfall, une fois).

## Contenu de l'artefact

```jsonc
{
  "schemaVersion": 1,
  "kind": "rules-v2-card-semantics",
  "source": { "compilerSha256": "…", "corpusSha256": "…" },
  "counts": { "cards": 1064, "exact": 176, "partial": 255, "refused": 588, "uncompiled": 45 },
  "cards": {
    "<oracleId>": {
      "name": "Perpetual Timepiece",
      "status": "exact",              // exact | partial | refused | uncompiled
      "abilityCount": 1,
      "exactAbilityCount": 1,
      "effects": [ { "type": "mill", "player": { "context": "source-controller" }, "amount": { "constant": 2 } } ],
      "capabilities": ["mill-card"],
      "triggerEvents": [],
      "refusalReasons": []
    }
  }
}
```

- La clé est l'`oracleId` Scryfall. Aucune carte n'est résolue par son nom.
- `effects` ne contient **que** les effets d'aptitudes compilées `exact`. Une carte `partial` n'hérite
  jamais de la sémantique de son aptitude refusée.
- `uncompiled` = le corpus du simulateur ne porte aucun texte Oracle pour cette carte (les 45 cartes
  double-face de l'export Archidekt). Distinct de `refused`.

## Contrat du pont

1. **Seules les aptitudes `exact` parlent.** Un refus ne produit aucun rôle : la carte garde exactement
   les tags heuristiques actuels.
2. **Additif uniquement.** Le pont n'enlève jamais un rôle trouvé par l'heuristique : une capacité
   statique, un mot-clé ou un effet non modélisé peuvent justifier un rôle que le compilateur n'a pas
   encore compilé.
3. **Aucune carte en dur.** Pas de branche par nom, `oracleId` ou deck. La seule clé est l'`oracleId`
   porté par la carte analysée.
4. **Recalcul des primitives.** Quand le pont ajoute un rôle, il recalcule `development`, `interaction`,
   `resilience`, `explosiveness` et `standalone` avec la formule partagée `metricScores` de
   `cardFeatures.js`. Sans ce recalcul, un rôle ajouté n'aurait aucun effet mesurable.
5. **Traçabilité.** Chaque carte augmentée porte `rulesSemantics: { status, roles, added }`, et
   `analyzePower` expose `result.semantics` + `methodology.cardSemantics`.

### Table de traduction (effet compilé → rôle aeon-scorer)

| Évidence compilée | Rôle ajouté | Justification |
| --- | --- | --- |
| `draw`, `player = source-controller` | `draw` | « you draw » : même définition que `isDrawSource` |
| `mill`, `player = source-controller` | `graveyard-setup` | « mill N » sur sa propre bibliothèque, comme `isGraveSetup` |
| `create-token`, `controller = source-controller` | `tokens` | producteur de jetons, comme `tokenRoles.producer` |
| `life-delta`, `player = source-controller`, constante `> 0` | `lifegain` | gain de vie du contrôleur, comme `lifeGainSource` |
| `add-mana`, `player = source-controller` | `mana` | source de mana, comme `isManaSourceText` |
| `search-library`, destination `battlefield`, filtre `objectType = land` | `land-ramp` | recherche de terrain déployé, comme `isLandRamp` |
| `search-library`, filtre `objectType ≠ land` | `tutor` | recherche non-terrain, comme `isTutor` |
| `destroy` / `exile` sur une cible `battlefield` non contrôlée par le contrôleur de la source | `removal` | définition exacte de `isTargetRemoval` (qui exclut les clauses « you control ») |
| `damage` sur une cible `battlefield` **typée permanent**, non contrôlée par le contrôleur | `removal` | un brûlage de joueur n'est pas un retrait |
| `modify-pt` avec `power < 0` sur une cible `battlefield` non contrôlée | `removal` | « -N/-N », comme `isTargetRemoval` |
| `move-object` `graveyard → battlefield\|hand`, cible `graveyard`, `owner = you` | `recursion` | « return … from your graveyard », comme `isRecursion` |
| `triggerEvents` contient `enters-battlefield` | `etb` | déclencheur d'arrivée, comme la détection `etb` |

Un effet qui ne figure pas dans cette table **ne produit rien** : pas de rôle par défaut, pas de règle de
secours.

## Ce que le pont refuse explicitement de modéliser

| Cas | Pourquoi |
| --- | --- |
| Rôles issus d'une aptitude refusée | Un refus ne dit pas ce que fait la carte. En déduire un rôle serait inventer la sémantique que le compilateur vient de refuser. |
| `mill` / `discard` subis par un adversaire | Le rôle `graveyard-setup` d'aeon décrit **sa propre** mise en place de cimetière ; `Fractured Sanity` n'est pas une carte de cimetière pour son contrôleur. |
| `damage` sur un joueur ou sur un ensemble non typé | Un brûlage n'est pas un retrait. Le compilateur donne le contexte (`opponents`, `all-players`) ou un `objectSet` : aucun des deux n'autorise `removal`. |
| `destroy` / `exile` sur un `objectSet` (« Destroy all creatures ») | C'est le rôle `wipe` d'aeon, pas `removal` ; le pont ne duplique pas une détection déjà correcte. |
| Retrait de tags heuristiques | Impossible de prouver l'absence d'un rôle à partir d'une compilation partielle. Le « faux positif » éventuel reste visible dans l'audit carte par carte. |
| `attach`, `untap`, `tap`, `scry`, `counter-delta`, `sacrifice`, `discard`, `copy` | Effets réels, mais sans rôle aeon-scorer univoque aujourd'hui. Aucune table de correspondance n'est inventée pour eux. |
| Cartes `uncompiled` (double-face sans texte Oracle dans le corpus) | Le simulateur ne compile rien : elles gardent le repli heuristique. Exemple mesuré : `Vesuva`, `Thran Portal`. |

## Mesurer

```bash
npm run semantics:report                 # 3000 itérations, écrit semantic/bridge-report.{json,md}
node scripts/semantic-bridge-report.mjs --iterations 300
```

Le mode « avant » est `analyzePower(..., { rulesSemantics: false })` : la seconde passe d'augmentation est
strictement désactivée, le reste de la chaîne est identique.

### Mesure de référence sur les 12 decks (`semantic/bridge-report.md`)

- 1064 cartes dans l'artefact : 176 `exact`, 255 `partial`, 588 `refusées`, 45 `uncompiled` ;
- 852 cartes uniques dans les 12 decks ; 709 ont un rôle fonctionnel avant, 728 après ; 29 cartes gagnent
  au moins un rôle (`mana=26`, `removal=3`) ;
- médiane des écarts de médiane : 0 · écart max : **+1** (`Far fortune v20.4` 49 → 50, P20 38 → 40) ;
- aucun paquet ajouté ni perdu sur les 12 decks.

Le score bouge peu parce que le compilateur ne couvre qu'une minorité des aptitudes du corpus (176/1064
cartes entièrement `exact`), et parce que les rôles ajoutés sont majoritairement `mana` sur des terrains —
un rôle que le modèle ne pondère pas encore — plus 3 vraies détections de `removal` manquées par
l'heuristique. C'est un résultat honnête : le pont rend la lecture **falsifiable et traçable** avant de
rendre le score plus précis.

## Garde de non-régression

`scripts/semantic-bridge-precon-diff.mjs` rejoue la bibliothèque publique de précons avec et sans pont et
n'imprime que les decks réellement affectés. Il sert à vérifier qu'un changement de table de traduction ne
déplace pas silencieusement un corpus de référence.

Résultat courant (`semantic/bridge-precon-diff.txt`) :

```
precons checked: 162
precons affected by the bridge: 161
  chaos-incarnate-scd.json median +1 · cartes pontées 4 · rôles {"mana":3,"removal":1}
```

161 précons « affectés » le sont uniquement par l'ajout du rôle `mana` sur des terrains — un rôle que le
modèle ne pondère pas encore. **Un seul précon sur 162 bouge de score, de +1 point**, et aucun paquet
n'est ajouté ni perdu. C'est la raison pour laquelle `SEMANTIC_VERSION` n'est pas incrémenté : les
snapshots de précons commités restent exacts.
