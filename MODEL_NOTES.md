# Aeon Scorer v3.2 — notes du modèle

## Hypothèse centrale

`Puissance du deck ≠ somme des puissances individuelles des cartes.`

Une carte produit d'abord des **primitives fonctionnelles**. Sa contribution dépend ensuite des packages, de la fenêtre d'accès, du commandant, de la redondance et de la distribution des mains.

## Ce que le Monte Carlo mesure réellement

La v3.2 est un **modèle d'accès à des capacités**, pas un moteur de règles Magic. Chaque colonne de la courbe répond indépendamment à une question du type : « cette fonction est-elle accessible à ce tour avec une fenêtre de mana plausible ? ».

Les colonnes ne signifient donc pas que commandant + package + interaction + ressource sont tous réalisables simultanément dans la même ligne de jeu. Le score central agrège donc un **profil d'accès structurel**, pas un état de partie entièrement exécutable carte par carte.

## Pourquoi un profil plutôt qu'un bracket

Deux decks peuvent avoir la même médiane et produire des expériences opposées :

- deck stable : P20 proche du P80 ;
- deck « fusée/tortue » : P80 et pic hauts, P20 bas, dispersion élevée.

La médiane doit toujours être lue avec P20, P80, pic, dispersion et dimensions.

## Sémantique v3.2

La détection distingue notamment :

- producteur vs payoff ;
- `counter-producer`, `counter-payoff`, `counter-doubler` ;
- `token-doubler` vs `trigger-doubler` ;
- `fast-mana` vs `burst-mana` ;
- type de carte réel vs simple mot mentionné dans le texte Oracle ;
- texte fonctionnel vs reminder text entre parenthèses.

Un package opérationnel exige deux cartes distinctes jouant les rôles producteur/payoff et une fenêtre de paiement plausible. Une simple présence de deux cartes portant le même thème ne suffit pas.

Des cas mécaniques sensibles sont traités explicitement : Lotus Petal/Spirit Guides/Rituals, LED selon le contexte, Sol Ring/Mana Crypt, Chrome Mox, Mox Diamond, Mox Opal et Mox Amber.

## Rôle d'AeonShift

Les points AeonShift sont un **prior externe optionnel et faible**. Ils ne sont jamais additionnés comme une vérité Commander et ne remplacent ni la simulation d'accès ni les packages.

## Validation v3.2

La v3.2 n'est considérée comme validée que si le **même head final** passe successivement :

1. smoke test ;
2. tests micro-sémantiques ;
3. tests métamorphiques ;
4. audit adversarial ;
5. build production ;
6. benchmark macro sur au moins 30 listes réelles ;
7. validation étendue, dont la régression réelle Hei Bai ;
8. second benchmark à 3 200 itérations ;
9. convergence 1 800 ↔ 3 200 ;
10. revue manuelle finale.

Le corpus macro couvre actuellement 38 decks réels : 15 précons, 15 listes cEDH avec 15 commandants distincts et 8 decks utilisateur/publics. Les valeurs historiques d'anciennes versions ne doivent pas être présentées comme les résultats finaux v3.2.

## Données réelles et amélioration continue

Chaque analyse web réussie est enregistrée avec son `engine_version`, son `semantic_version`, le hash exact du deck et un `oracle_snapshot_hash`. Les analyses alimentent un corpus QA versionné afin de rendre visibles les erreurs de lecture de cartes, de packages ou de mécaniques.

Ce corpus est **adversarial / observationnel**, pas une vérité d'entraînement :

- la fréquence d'un tag Aeon ne prouve pas qu'il est correct ;
- un score utilisateur répété ne devient jamais une cible 0–100 ;
- une correction sémantique doit être vérifiée indépendamment contre le texte/type Oracle ;
- une correction candidate ne peut être promue qu'après les mêmes gates micro, métamorphiques, adversariales, macro et de convergence.

La frontière reste **RAW → AUDIT → APPROVED MODEL**. La file d'audit est conçue pour être traitée par une planification ChatGPT connectée à Supabase, séparée du code de production et sans worker OpenAI API/GitHub Models embarqué dans l'application.

## Limites connues et assumées

Ces limites ne doivent pas être cachées derrière le score :

- **un seul commandant** est supporté ; Partner / Friends Forever / Background à deux commandants ne le sont pas encore ;
- les **tuteurs** sont détectés et influencent la structure/consistance, mais leurs cibles ne sont pas exécutées dynamiquement dans le Monte Carlo ;
- une carte de **pioche lançable** est mesurée comme accès à une ressource, mais le moteur ne lance pas ensuite réellement cette pioche pour modifier toutes les mains futures ;
- les **coûts alternatifs contextuels** (Force of Will, Fierce Guardianship, etc.) ne sont pas encore planifiés comme un moteur de règles ;
- les symboles de mana rares, **hybrides ou phyrexians**, ainsi que les choix de coût de certaines **split cards / cartes modales double-face**, restent approximatifs tant qu'un solveur complet de choix de coût n'est pas intégré ;
- la bibliothèque de **combos connues** est volontairement petite et haute confiance ; aucune détection ne signifie pas absence de combo ;
- « options de reprise après disruption » mesure l'accès à une ressource, un autre package ou un recast du commandant ; ce n'est pas une simulation complète d'un wipe ;
- politique multijoueur, stack réelle, choix de cibles, combat complet et décisions adverses ne sont pas simulés ;
- certaines capacités de mana très conditionnelles ou spécifiques peuvent rester conservatrices ou approximatives.

## Frontière suivante

Les gains de précision les plus importants après v3.2 seront :

1. exécution tutor → cible → package ;
2. pioche réellement propagée dans les séquences ;
3. solveur complet des coûts alternatifs, hybrides, phyrexians et cartes à plusieurs faces/coûts ;
4. scénarios adverses commandant retiré / wipe / graveyard hate / moteur retiré ;
5. support multi-commandants ;
6. corpus de parties observées pour calibration empirique.
