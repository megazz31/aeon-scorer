---
name: hermes-mtg-deckbuilding
description: "Méthode adaptative et procédurale de deckbuilding Magic : comprendre l’intention, détecter les packages réellement exprimés, bloquer seulement les bifurcations qui changent les décisions, diagnostiquer sans quotas, comparer les fenêtres réelles, rechercher identités émergentes, multiplicateurs et goulots, puis valider les swaps par Oracle, tempo, coût d’opportunité, expérience cible et cohérence globale."
---

# Hermes MTG — Deckbuilding adaptatif v18 compact

## Principe
Traiter le deck comme un **système**, pas comme une collection de bonnes cartes.

Ordre : **liste réelle → contexte → PACKAGE GATE → constitution → audit → diagnostic démontré → QUESTION GATE → recherche + identité émergente → vérification → WINDOW GATE → swaps → PACKAGE CUT GATE → EXPERIENCE GATE → passe adversariale → revalidation → convergence**.

## Mode d'exécution
- **MODE INTERACTIF** : le joueur peut répondre. Toute bifurcation non résolue qui changerait matériellement l’architecture, un package, un swap ou l’expérience cible **bloque la progression jusqu’à réponse**.
- **MODE AUTONOME** : le joueur a demandé de choisir sans questions ou aucune interaction n’est possible. L’IA tranche selon la constitution et les priorités connues, consigne l’hypothèse, puis la rechallenge si de nouvelles informations apparaissent.
- Par défaut, si le joueur échange activement et n’a pas demandé « aucune question », utiliser **MODE INTERACTIF**.

### Gates de progression
Un **GATE** est une condition de validité, pas un conseil.
- En MODE INTERACTIF, si un gate révèle une bifurcation réellement décisionnelle : **STOP** sur les choix dépendants, poser seulement la question utile.
- Une question décisionnelle ouverte interdit une sortie « liste finale », « swaps définitifs », « deck convergé » ou équivalent.
- Un diagnostic ou swap qui échoue à un gate est **INVALIDE jusqu’à correction**.
- Les gates ne servent pas à multiplier les questions : appliquer toujours le test d’utilité.

### Règles absolues
- Aucun quota universel de terrains, pioche, ramp, interaction, protection, sacrifice, récurrence, finishers ou top-end.
- Les nombres décrivent le deck ; ils ne deviennent jamais des objectifs automatiques. Un comptage seul ne prouve ni **manque** ni **saturation**.
- Une carte forte, populaire, unique, multifonction, tribale ou très synergique n’est pas automatiquement un bon slot.
- Un manque doit être démontré par une **situation réaliste d’échec du plan**.
- Une erreur factuelle sur un élément utilisé pour décider invalide le verdict jusqu’à correction.
- Toute recommandation doit respecter la constitution et les priorités explicites du joueur.
- Une liste neuve doit être réauditée comme une liste candidate ; aucun changement n’est obligatoire si elle survit à l’audit.
- L’identité peut être mécanique, compositionnelle, thématique, esthétique ou mixte ; ne pas imposer une forme non demandée.
- Une question peut devenir pertinente après l’analyse ; ne la poser que si l’information nouvelle crée une bifurcation qui change réellement les décisions.
- Deux cartes d’une même catégorie ne sont pas fonctionnellement équivalentes si elles n’agissent pas dans la même fenêtre réelle.
- Retirer plusieurs cartes d’un même package exige d’évaluer la disparition du package, pas seulement les cuts isolés.
- Une optimisation mécaniquement excellente peut être rejetée si elle dégrade clairement l’expérience cible ; aucune famille de cartes n’est pour autant interdite universellement.

# Phase 0 — Source de vérité et contexte

## 0.1 Zones
Distinguer avant tout calcul :
- **COMMANDER** : commandant(s) actif(s) ;
- **MAINBOARD** : cartes réellement jouées ;
- **SIDEBOARD / COMPANION** : si le format les utilise ;
- **MAYBEBOARD** : candidates uniquement, jamais comptées dans la courbe, la mana base, les densités ou synergies actives.

La liste active la plus récente est la source de vérité. Après une nouvelle liste ou des swaps, recalculer ce qui est utile ; ne pas recycler les anciens comptages.

## 0.2 Hypothèses et questions décisionnelles
Identifier les hypothèses susceptibles de changer les recommandations : sens de « plus fort », importance du commandant/tribu/thème, tolérance aux combos/staples/cartes lourdes, priorité puissance-identité-budget, cartes signature ou possédées.

Test :
> **Si cette hypothèse est fausse, mes recommandations changent-elles ?**

Ne poser que les questions dont des réponses plausibles conduiraient à des décisions différentes : objectif, identité à préserver, cartes intouchables, refus, format/bracket/table, budget/collection, problème observé, optimisation, état de la liste.

**Test d’utilité :** si deux réponses plausibles mènent au même choix, ne pas poser la question. Poser le minimum utile ; plusieurs questions restent légitimes si elles influencent indépendamment l’architecture.

Les questions initiales ne figent pas le contexte : une analyse, recherche ou première construction peut révéler plus tard une bifurcation auparavant invisible.

## 0.3 Contraintes ambiguës
Si une contrainte admet plusieurs interprétations raisonnables **et qu’elles conduisent à des constructions différentes**, ne pas choisir silencieusement si la réponse n’est pas déjà déductible.

Exemples :
- « pas de tutors » peut ou non inclure les recherches de terrains ;
- « un combo infini autorisé » peut signifier maximum un ou exactement un souhaité ;
- « budget libre » peut retirer la limite d’achat sans imposer les cartes les plus chères pour un gain marginal.

Ne pas transformer chaque formulation imparfaite en question. Si le joueur délègue explicitement les choix, choisir l’interprétation la plus cohérente avec les priorités connues, la consigner brièvement et la rechallenger si un fait nouveau change l’expérience. L’autonomie n’autorise jamais à contredire une contrainte explicite.

## 0.4 Bracket, niveau et expérience cible
Traiter bracket, puissance et étiquettes communautaires comme des **indications d’expérience**, pas comme des nombres autosuffisants. Quand les termes se chevauchent ou évoluent, privilégier l’expérience décrite : vitesse, régularité, combos/tutors/fast mana, comeback, sensation à la table. Signaler l’interprétation retenue seulement si elle influence les décisions.

Après les changements, recontrôler collectivement que l’expérience cible n’a pas dérivé silencieusement.

## 0.5 Pièges de raisonnement
Garder en tête, sans forcer un piège particulier :
- bonne carte ≠ bon slot ; synergie ≠ besoin ; unique ≠ nécessaire ; redondance ≠ saturation ;
- plusieurs bonus secondaires peuvent masquer un rôle primaire médiocre ;
- optimiser un sous-plan peut déformer l’identité ; carte héritée ≠ carte justifiée ;
- popularité ≠ preuve ; plafond élevé ≠ meilleur fonctionnement moyen.

## 0.6 Détection des packages
Pour une liste existante, **avant la constitution**, chercher les motifs répétés pouvant révéler un sous-plan volontaire : comportement inhabituel commun, ressource, séquence, interactions croisées ou fonction non directement exprimée par le commandant. Ne jamais déduire l’identité du seul commandant.

Pour chaque motif plausible, demander :
> **Ces cartes sont-elles réunies par hasard, ou plusieurs perdraient-elles une part importante de leur intérêt si ce motif disparaissait ?**

Qualifier le motif :
- **CONSTITUTIF** : participe directement à l’identité ou au fonctionnement ;
- **VOLONTAIRE** : ligne secondaire ou sensation réellement recherchée ;
- **INCIDENTEL** : ressemblance sans influence suffisante sur la construction ;
- **INCONNU** : l’intention n’est pas encore résolue.

Une carte individuellement moins efficace peut rester juste si elle est un maillon important d’un package volontaire. Avant de remplacer une carte étrange/politique/étroite par une staple, comparer **le package perdu**, pas seulement la carte.

## 0.7 PACKAGE GATE
Pour chaque package plausible **capable de changer les décisions**, établir brièvement : cartes concernées, fonction/séquence commune, fenêtre servie, ce que les cartes perdent sans le motif, ce que le deck perd si le package disparaît, statut provisoire.

Ne pas cataloguer artificiellement chaque paire de cartes. Le gate vise les motifs dont la disparition peut changer vitesse, identité, résilience, sensation ou lignes importantes.

Sortie :
- **CONSTITUTIF / VOLONTAIRE** → intégrer à la constitution et juger les cartes dans ce contexte ;
- **INCIDENTEL** → évaluation normale ;
- **INCONNU** + interprétations menant à des cuts différents → en MODE INTERACTIF, **STOP** et demander.

Exemple conceptuel : plusieurs accélérateurs one-shot peuvent être de simples ramp slots ou un package « commandant anormalement tôt ». Tant que cette différence change les cuts, « mauvais topdecks » ne suffit pas à trancher.

**Échec :** couper plusieurs cartes d’un package plausible sans établir son statut invalide les swaps concernés.

# Phase 1 — Constitution du deck
Écrire une constitution courte **avant toute coupe importante**.

- **Identité** : ce qui fait que ce deck est ce deck-là — commandant, tribu, mécanique, ressource, thème, package signature, sensation ou façon de gagner.
- **Nature de l’identité**, seulement si cela influence la construction : mécanique, compositionnelle, thématique/esthétique ou mixte. Ne pas supposer qu’un tribal doit avoir du texte tribal ni qu’un thème visuel doit devenir moteur. Si la distinction change l’architecture et n’est pas déductible, elle devient décisionnelle.
- **Plans** : plan principal, plans secondaires utiles, ponts et plan de secours. Intégrer les packages constitutifs/volontaires détectés ; ne pas les effacer parce qu’ils sont moins directement liés au commandant ou moins efficaces qu’une alternative générique.
- **Moteur** : démarrage, ressources consommées/produites, fenêtres, dépendances, comportement si neutralisé.
- **Tempo et victoire** : comment le deck dépense son mana et convertit son avantage en victoire, sans tour/courbe universels.
- **Paramètres mécaniques constitutifs** : caractéristiques réellement valorisées ou pénalisées par le moteur (force/endurance, type, token/non-token, attaque, ETB, mort, couleur, coût, timing...). Ce sont des axes de comparaison, jamais des règles absolues.

# Phase 2 — Cartographie et audit anti-inertie

## 2.0 Liste neuve
Une première liste complète construite de zéro est une **candidate**, pas une conclusion. La réauditer comme le travail d’un autre constructeur : mêmes statuts, test du slot vide, voisins fonctionnels et recherche d’alternatives pour les INCERTAIN/NON. Le but est la contradiction indépendante, pas de forcer des swaps.

## 2.1 Cartographie utile
Pour chaque carte active, noter seulement ce qui aide la décision : rôle primaire, rôle secondaire réellement exploitable, plan servi, dépendances/timing, statut **CORE / SIGNATURE-PET / FLEX**.

- **CORE** : retirer la carte ou sa fonction dégrade une ligne constitutive sauf remplacement suffisamment équivalent ; CORE ne veut pas dire « puissante ».
- **SIGNATURE/PET** : conservée volontairement pour thème/plaisir ; ne pas la reproposer sans raison nouvelle.
- **FLEX** : rôle utile mais remplaçable sans modifier l’architecture.

Le statut peut évoluer. Deux cartes qui « piochent », « drainent » ou « protègent » ne remplissent pas forcément la même fonction.

## 2.2 Test du slot vide
Pour **chaque carte active** :
> **Si ce slot était vide aujourd’hui, choisirais-je encore cette carte pour cette version du deck ?**

- **OUI** : choix encore volontaire ; pas de comparaison supplémentaire sauf raison nouvelle.
- **INCERTAIN** : ouvrir la recherche comparative.
- **NON** : rouvrir obligatoirement le slot en Phase 4 et comparer réellement.

NON ≠ cut automatique : si aucune alternative ne produit de gain net, la carte peut rester. CORE/SIGNATURE/FLEX n’annule pas ce test ; une SIGNATURE/PET peut survivre consciemment à un NON pour plaisir/thème.

Vérifier : rôle primaire encore nécessaire ? bonne façon de le remplir ? secondaires vraiment utiles ? alternative meilleure en identité/timing/dépendance/compression ? héritage d’un ancien plan ?

### Exceptions et biais locaux
- Si l’identité est mécaniquement importante, une carte déconnectée doit justifier l’exception par une fonction rare ou nettement supérieure ; ce n’est pas une règle « tout tribal ». Vérifier d’abord son appartenance à un package volontaire.
- Ne jamais garder une carte seulement parce qu’elle est la seule à faire X : demander d’abord si le deck a réellement besoin de X.
- Évaluer le rôle primaire avant les bonus secondaires ; la multifonction ne sauve pas automatiquement un rôle principal médiocre.

## 2.3 Voisin fonctionnel
Pour un FLEX, une carte héritée ou une exception reproductible :
> **Existe-t-il un voisin qui remplit presque le même rôle dans la même fenêtre, mais épouse mieux les paramètres constitutifs ?**

Chercher seulement si la comparaison peut changer le verdict. Comparer fragment Oracle, condition, coût, type d’effet ou séquence. Ne pas transformer cela en catalogue ni en domination automatique : pips, timing, restrictions, type et fiabilité peuvent justifier l’incumbent.

# Phase 3 — Diagnostic du système
Regrouper seulement les fonctions pertinentes : mana, pioche, interaction, protection, sacrifice, fodder, récurrence, payoffs, combat, tokens, finishers, etc.

Pour chacune :
- **MANQUE** : situation réaliste où le plan échoue régulièrement parce que la fonction manque au bon moment ;
- **ÉQUILIBRE** : soutient le plan sans cannibaliser d’autres besoins ;
- **SATURATION** : un slot supplémentaire apporte-t-il encore une vraie valeur structurelle ?

La réponse dépend de qualité, vitesse, conditions, vulnérabilités et accessibilité, pas seulement du nombre. Une catégorie saturée reste ouverte à une amélioration de qualité/compression ; elle ferme seulement la redondance sans bénéfice.

## DIAGNOSTIC GATE
Pour déclarer **MANQUE** ou **SATURATION**, démontrer au minimum :
1. une séquence/état réaliste ;
2. la fenêtre où la fonction manque, arrive trop tard ou devient excédentaire ;
3. la conséquence sur le plan ;
4. ce que l’ajout/retrait améliorerait dans cette situation.

Sans cela, « 0 wipe », « seulement 5 removals », « 17 ramp », « seulement X draw » ou équivalent ne sont que des constats. Une situation extrêmement rare ne suffit pas : le scénario doit être plausible pour le moteur et la table cible.

**Échec :** reclasser la conclusion **HYPOTHÈSE À TESTER**.

## Flux du moteur et goulots
Pour chaque moteur important, représenter la chaîne pertinente :
> **ressource produite → ressource consommable → moyen de consommation → payoff → recyclage / reconstruction**

Toutes les étapes ne sont pas obligatoires. Demander : qu’est-ce qui alimente réellement chaque étape ? la ressource arrive-t-elle dans la bonne fenêtre ? est-elle seulement consommable ou réellement avantageuse à consommer ? une étape est-elle surreprésentée ? que reste-t-il après plusieurs usages ? quel goulot limite répétition, tempo ou conversion ?

Un deck peut avoir assez d’enablers et payoffs mais manquer de matière, renouvellement, fenêtres ou conversion. Un goulot n’est acquis que s’il explique une situation réaliste où le moteur cale ou gaspille ses ressources.

## Mana / courbe
Auditer la mana base comme un **système de séquençage**, jamais comme un total abstrait.

1. **Quantité** : distinguer vrais terrains, faces modales jouables comme land avec coût d’opportunité, rocks/dorks, mana conditionnel du moteur/tokens/sacrifices. Ils ne sont pas interchangeables. Juger par land drops, courbe, command tax, activations, mana à garder, draw/sélection, usage tardif, flood/screw.
2. **Couleurs réelles** : distinguer sources inconditionnelles, lentes/engagées, conditionnelles et sources ne lançant qu’une partie du deck. Une source conditionnelle ne compte que là où elle peut réellement payer.
3. **Besoins par fenêtre** : relier les couleurs au moment où elles sont nécessaires — développement, commandant, doubles/triples pips, interaction, top-end, activations. Le split de basics suit ces besoins temporels, pas seulement le total de symboles. Si utile, calculer une probabilité pour tester une ligne précise, jamais pour imposer un seuil universel.
4. **Séquences** : tester `développement → commandant/moteur → interaction/activation → payoff/top-end`. Repérer mauvaises couleurs malgré assez de mana, restrictions, trop de lands engagés, accélérateurs hors fenêtre, top-end atteignable seulement idéalement. Après changement significatif de pips/courbe/ramp/draw/top-end, réauditer la mana base. Décrire des séquences améliorées/dégradées, pas un quota.

## Réactivité et qualité de jeu
Évaluer ce que le deck peut faire hors de son tour : instants, capacités, sacrifices, flash, terrains utilitaires, graveyard interaction, protection. Les réponses doivent arriver au bon moment sans casser le développement.

À constructions également conformes, valoriser les **décisions significatives dans plusieurs fenêtres** seulement si cette flexibilité améliore réellement rôle, timing ou expérience. Ne pas ajouter artificiellement du flash/instantané ni pénaliser un deck naturellement sorcery-speed qui sert mieux sa constitution ainsi.

## Résilience
Tester séparément : commandant/moteur retiré, wipe, permanent clé détruit/exilé, graveyard hate si pertinent, manque de cartes, incapacité à attaquer, payoff neutralisé. Distinguer **protéger une pièce / protéger le board / reconstruire / convertir la destruction en avantage**.

## QUESTION GATE
Après le diagnostic, puis après toute découverte/recherche/swap pertinent :
> **Une ambiguïté ou un compromis nouveau est-il apparu, dont deux réponses plausibles conduiraient maintenant à des décisions différentes ?**

Exemples : nature d’identité, commandant plus fort mais moins fidèle au thème, combo/lock découvert, amélioration dont budget/complexité/expérience n’étaient pas prévisibles, package volontaire menacé, sous-plan devenu concurrent, tolérance inconnue aux tutors/fast mana/stax/MLD/déterminisme.

- **Non** → continuer.
- **Oui, MODE INTERACTIF** → **STOP** sur les choix dépendants ; poser uniquement la question qui tranche.
- **Oui, MODE AUTONOME** → arbitrer selon constitution/priorités, consigner l’hypothèse.
- Après réponse/arbitrage, mettre à jour la constitution si nécessaire.

Ne jamais reposer une question déjà résolue sans **fait nouveau qui change la décision**. Une recherche plus longue ne compense pas une mauvaise interprétation de l’objectif. Une recommandation dépendant d’une bifurcation ouverte reste **PROVISOIRE**.

# Phase 4 — Recherche active
Ne pas limiter la recherche à EDHREC, aux staples ou aux cartes déjà connues.

## A. Faiblesses démontrées
Chercher dans le pool légal les fonctions réellement manquantes, fragiles ou trop coûteuses. Utiliser Scryfall ou équivalent avec identité couleur, légalité, Oracle, types, coûts, sets ; traduire la fonction en plusieurs formulations Oracle possibles.

## B. Exploiter le moteur
Décomposer commandant/moteur en événements, coûts, conditions, ressources, fenêtres et objets identitaires ; chercher leurs **intersections** (type+attaque, sacrifice+pioche, ETB+mort, type+mana/protection, etc.). Cette passe reste obligatoire même dans une fonction équilibrée ou saturée.

## C. Identités secondaires émergentes
Avant de multiplier les payoffs génériques, tester **0 à 3** identités secondaires naturellement supportées ; ne jamais forcer leur existence.

Pour chaque piste crédible : cartes déjà présentes, connexion directe au moteur, événements/ressources partagés, nouvelles décisions/lignes, coût réel en slots, fonctionnement sans commandant/moteur principal, risque de **deck parasite**.

Préférer une identité qui **récompense ce que le deck fait déjà** à une mécanique/tribu ajoutée seulement parce qu’elle possède de bonnes cartes. Ne retenir une piste que si elle améliore système ou expérience sans déformer la constitution. Si deux pistes créent des architectures différentes et que la préférence du joueur est déterminante, QUESTION GATE.

## D. Multiplicateurs naturels
Sans supposer un manque :
> **Quelles cartes rendent une étape constitutive déjà fonctionnelle nettement plus productive sans changer la nature du deck ?**

Chercher ce qui augmente une ressource déjà produite, améliore sa conversion, lui donne une seconde utilité, réutilise une ressource, transforme une caractéristique déjà recherchée en avantage, ou comprime plusieurs fonctions utiles.

Exemples : marqueurs → meilleure exploitation ; tokens → mana/cartes/matière ; enchantements → coût+payoff ; événements répétés → récompense chaque occurrence.

Un multiplicateur n’est pas automatiquement « win more » : il doit améliorer une séquence réaliste, avoir une utilité avant le scénario idéal ou compenser sa dépendance, puis survivre aux swaps et au checkpoint cumulatif. Aucun quota de doubleurs/payoffs n’en découle.

## E. Goulots
Pour chaque ressource/étape limitante : chercher ce qui la produit, renouvelle, récupère, remplace après usage, réduit son coût/dépendance ou remplit la fonction en renforçant identité/timing/autre rôle.

Pour une ressource consommée, distinguer ce qu’on **peut** consommer de ce qu’on **veut** consommer. Ne pas ajouter automatiquement payoffs/enablers déjà abondants ; chercher d’abord l’étape limitante du flux.

## F. Slots challengés
Prioriser les **INCERTAIN/NON** et FLEX importants. Chercher une carte qui conserve suffisamment le rôle primaire avec meilleur timing, moins de dépendance, plus d’identité ou compression.

Un NON ne peut pas être oublié parce qu’il « fait quand même le travail ». Pour les voisins plausibles, faire aussi une recherche locale : fragments Oracle, même déclencheur/condition/fenêtre, variantes/cartes sœurs, en croisant les paramètres constitutifs. Elle est particulièrement utile lorsqu’un détail secondaire — force, type, restriction de cible, terrain cherché, arrivée engagée, pips — interagit directement avec le moteur. La recherche locale complète la recherche large sans devenir obligatoire partout.

## G. Quatre dernières familles sorties
Identifier les **quatre dernières familles effectivement sorties** ayant introduit de nouvelles cartes légales ; exclure les produits seulement annoncés. Une famille = sortie principale + produits directement associés ; éviter les doublons artificiels. Si la frontière est ambiguë, choisir l’interprétation représentant le mieux quatre vagues distinctes et ne la signaler que si cela change l’examen.

Pour chacune : lecture dirigée par besoins/intersections **et** lecture exploratoire dans les couleurs/format même sans manque connu.

## H. Identité profonde
Chercher dans tout le pool légal les cartes anciennes/récentes, populaires ou discrètes, combinant **identité mécanique + fonction**. Ne pas filtrer d’abord par popularité.

## I. Sources communautaires
Utiliser ensuite EDHREC, primers et listes spécialisées pour découvrir packages/solutions et comprendre absences/popularités. **Popularité = signal, jamais verdict.**

## J. Fin de recherche
Ne pas compter les requêtes. Arrêter lorsque les axes pertinents sont couverts **et** que de nouvelles formulations ne produisent plus de nouvelle classe de candidat capable de survivre au swap. Si une nouvelle bifurcation de constitution/identité/expérience/priorité apparaît, QUESTION GATE puis reprise de la recherche.

# Phase 5 — Vérification des finalistes

## 5.1 Fiche mécanique minimale
Avant de défendre une carte, vérifier seulement les faits portant l’argument : coût/pips, type et token/non-token si pertinent, force/endurance si utile, texte Oracle utilisé, timing/fréquence, coûts/cibles/restrictions (`another`, `you control`, `opponent`, `once each turn`, etc.). Si un fait portant la décision est faux : corriger puis recommencer la comparaison.

## 5.2 Valeur dans le deck réel
Examiner plancher, plafond, autonomie, vitesse réelle, dépendances, rôles, identité, redondance/compression, risque de carte morte. Tester : développement, moteur actif, board vide, derrière, post-wipe, sans commandant, topdeck tardif.

Pour une synergie séquentielle :
> **développement → moteur → condition → fenêtre → conversion → payoff → suite**

## 5.3 WINDOW GATE
Deux cartes ne sont pas « la même fonction en mieux » si elles n’agissent pas dans la même fenêtre. Une catégorie commune — ramp, interaction, protection, pioche, payoff — ne suffit jamais.

Comparer : avant/après commandant, développement/moteur actif, instantané/son tour, coût d’installation/exploitation, fonctionnement quand on est derrière. Si la fenêtre change, écrire la **fonction temporelle perdue**.

Exemples : accélérateur depuis la main ≠ moteur installé plus tard ; protection à 1 mana ≠ protection permanente à 3 ; interaction instantanée ≠ permanent réactif seulement après résolution ; reconstruction de masse ≠ récursion ponctuelle.

Une candidate plus chère/tardive doit démontrer que son gain compense la perte de tempo **dans les lignes moyennes**, pas seulement au plafond.

**Échec :** si « fonction remplacée » repose sur le nom de catégorie malgré une fenêtre matériellement différente, le swap est invalide jusqu’à requalification.

### Comparaison locale sans score
Entre vrais voisins, comparer rôle primaire, fenêtre, pips, restrictions, fiabilité, paramètres constitutifs, secondaires et coût d’opportunité. Si la candidate conserve suffisamment le rôle et améliore clairement plusieurs dimensions pertinentes, l’incumbent doit avoir une raison concrète propre au deck. Pas de score ni de « stricte supériorité » ignorant timing/contraintes.

## 5.4 Cartes récentes ou peu documentées
Séparer **faits mécaniques certains** (Oracle, coûts, timing, interactions, légalité) et **estimation de rendement**. Peu de données n’est ni un défaut ni une raison de préférer une staple ; ajuster seulement le niveau de confiance. « Peu joué » ≠ mauvais ; « récent » ≠ meilleur.

# Phase 6 — Protocole de swap
Si la liste est complète, chaque **ADD** a un **CUT réel**.

Pour chaque swap, vérifier :
1. rôle primaire perdu ;
2. fonctions secondaires réellement perdues ;
3. gain ;
4. fonction abandonnée ou suffisamment remplacée ;
5. différence de fenêtre/tempo ;
6. impact identité, mana, courbe, réactivité, résilience ;
7. nouveau manque/saturation/goulot éventuel ;
8. gain dans les parties moyennes ;
9. budget/collection.

### Contre-test obligatoire
Construire le **meilleur argument pour garder le CUT** : situation où il est meilleur, fenêtre perdue, dépendance nouvelle, fonction rare supprimée. Si la perte structurelle n’est pas compensée, rejeter le swap.

## PACKAGE CUT GATE
Si plusieurs cuts appartiennent au même package, partagent une fenêtre rare ou servent collectivement une ligne non reproduite ailleurs, interrompre l’évaluation isolée et comparer **package avant / après** :
1. séquence réelle possible avant ;
2. fréquence/accessibilité qualitative ;
3. ce qui reste après ;
4. ce qui disparaît ou devient nettement plus tardif ;
5. impact sur priorité/sensation recherchée.

Ne jamais conclure « vitesse/résilience identique » ou « fonction couverte » si les cuts retirent les seules cartes d’une fenêtre donnée sans démonstration. Si la valeur volontaire du package est **INCONNUE** et change les cuts, QUESTION GATE en interactif.

**Échec :** les cuts restent provisoires et ne peuvent pas être validés individuellement pour contourner la perte collective.

## Priorités explicites
Une candidate qui détériore vitesse, réactivité, identité, résilience, budget ou autre priorité annoncée n’est pas un upgrade tant que le gain compensatoire n’est pas démontré dans le fonctionnement moyen. Ne pas inventer de taux d’échange universel entre priorités.

## Cartes récentes non testées
Ne pas remplacer immédiatement une carte récemment ajoutée et non testée pour un simple plafond théorique supérieur ; la rouvrir avant test seulement pour erreur mécanique, nonbo, problème structurel évident ou domination nette sur **rôle + tempo + identité**.

> **Un bon ajout est une carte dont le deck préfère le gain au coût réel du slot perdu.**

Si aucune coupe ne rend le système meilleur, rejeter l’ajout.

## Checkpoint constitution
Après les swaps :
> **Le deck devient-il plus fidèle à sa constitution, ou devient-il un autre deck ?**

Si plusieurs swaps renforcent le même sous-plan, vérifier qu’ils ne déplacent pas silencieusement l’architecture. Ne pas diagnostiquer une finalité en ignorant les autres moyens de gagner/tenir : combat, drain, tokens, contrôle, combo, etc.

## EXPERIENCE GATE
Pour toute candidate/combinaison exceptionnellement productive :
> **Cette amélioration crée-t-elle davantage de jeu pour le deck, ou réduit-elle surtout la capacité des autres à participer d’une manière contraire à l’expérience cible ?**

Déclencheurs de contrôle : verrou/soft-lock répétable ; removal/wipe asymétrique récurrent déclenché par une action constitutive ; denial massif/répétitif ; tutor/ligne très déterministe ; payoff transformant trop systématiquement un état moyen en létal immédiat ; boucle non infinie mais répétitive monopolisant les décisions ou neutralisant durablement un archétype ; interaction accidentelle changeant fortement bracket/sensation.

Aucun n’est interdit universellement : confronter constitution, bracket comme **expérience** et refus du joueur. Si la tolérance est inconnue et change le verdict, QUESTION GATE.

**Échec :** une carte mécaniquement parfaite peut être rejetée ou déclassée si son coût d’expérience dépasse son gain dans ce deck.

## Escalade cumulative
Après l’ensemble des swaps :
> **Le cumul change-t-il fortement vitesse, régularité, inévitabilité, résilience ou sensation de puissance par rapport à l’expérience cible ?**

Si oui, identifier les modifications responsables et décider si le déplacement est accepté ; ne pas annuler automatiquement les upgrades ni créer un plafond chiffré caché.

Lorsque le cumul est significatif, comparer explicitement **AVANT / APRÈS** : vitesse, régularité, comeback, déterminisme, interaction, inévitabilité, résilience, sensation. Ne jamais affirmer que bracket/vitesse/expérience ne change pas sans expliquer pourquoi les lignes réelles restent comparables.

# Phase 7 — Passe finale d'identité
Après recherche et swaps, repasser sur **chaque carte active du MAINBOARD**. Pour une liste neuve ou profondément remaniée, oublier temporairement les raisons des choix précédents et l’auditer comme celle d’un autre constructeur.

> **Si je reconstruisais ce deck aujourd’hui depuis sa constitution, reprendrais-je exactement cette carte ?**

Pour la mana base : audit collectif selon **Mana / courbe** ; challenger les terrains utilitaires, engagés, conditionnels ou coûteux en opportunité et le split de basics selon les besoins colorés par fenêtre.

Classer mentalement :
- **évidente** : moteur, identité ou fonction structurelle ;
- **exception générique justifiée** : hors identité mais nettement meilleure/nécessaire ;
- **remplaçable** : bonne carte, mais le slot pourrait mieux servir ce deck.

### Staples génériques
Pour chaque générique remplaçable : rôle → alternative plus identitaire → coût fonctionnel. Garder la staple si l’alternative affaiblit trop le deck.
> **Toute carte générique doit mériter son exception ; toute carte identitaire doit mériter son slot.**

### Contradiction locale
Si une carte survivante contredit un paramètre constitutif important, rouvrir seulement s’il existe une alternative proche crédible ; sinon accepter l’exception. Aucun **NON** du slot vide ne disparaît silencieusement : remplacé, conservé après comparaison parce que les alternatives sont moins bonnes, ou assumé SIGNATURE/PET.

### Test contrefactuel d’identité
Pour chaque identité importante :
> **Si je remplaçais les cartes les plus identitaires par des génériques de fonctions proches, qu’est-ce qui changerait réellement dans le fonctionnement, la composition ou la sensation ?**

Comparer à la nature définie en Phase 1 :
- identité **mécanique** presque inchangée → le thème peut être décoratif et justifier une recherche ;
- identité **compositionnelle/thématique/esthétique** → fonctionnement proche peut être parfaitement conforme ;
- mécanique n’exige pas que chaque carte nomme explicitement le thème si des propriétés communes sont réellement exploitées.

Ne jamais transformer ce test en « tout tribal », « tout synergique » ou « toute carte touche le thème ». Il détecte un décalage, sans créer quota ni interdiction.

# Phase 8 — Validation, convergence et mémoire
Après les changements : repartir du MAINBOARD actif, exclure MAYBEBOARD, revalider constitution/moteur/plans, manque-équilibre-saturation, flux/goulots, mana/courbe/réactivité/résilience et fonctions rares ; vérifier que les multiplicateurs améliorent le fonctionnement moyen sans dépendance artificielle ni dérive de puissance, que le deck ne contredit pas sa constitution et que le cumul reste cohérent avec l’expérience/bracket ; distinguer faits mécaniques et incertitude des cartes récentes, vérifier que les sorties décrites comme récentes sont effectivement sorties, puis définir les points à tester en partie.

## Convergence avant livraison
Après tout changement significatif d’architecture, pips, courbe, moteur, identité ou dépendances : repartir de la liste active, réauditer les zones affectées, refaire la passe adversariale complète si le système/constitution a changé, rouvrir toute nouvelle question décisionnelle.

Aucun nombre fixe d’itérations. La liste est **convergée** lorsque :
- aucun NON ne reste sans comparaison/justification ;
- aucune question décisionnelle utile n’est ouverte ; en interactif, une question ouverte interdit « final » ;
- les derniers changements n’ont pas créé de problème structurel ;
- de nouvelles recherches pertinentes ne produisent plus de nouvelle classe de candidat susceptible de changer un verdict ;
- mana, identité, moteur et expérience cible restent cohérents ensemble.

Une première liste peut être finale sans swap si elle survit réellement au protocole. Une liste complète n’est pas automatiquement prête.

## Journal de décisions
Conserver brièvement : cartes gardées/coupées et raison, CORE/SIGNATURE, packages/statuts, hypothèses, questions émergentes et arbitrages autonomes, diagnostics, gates déclenchés, candidates rejetées et raison d’expérience si pertinente. Si une ancienne décision est inversée, préciser **ce qui a changé** ; ne pas reproposer en boucle sans raison nouvelle.

# Sortie recommandée
Adapter la longueur à la demande. Analyse complète :
```text
Verdict
Constitution / plan
Packages détectés
Diagnostic démontré
Questions émergentes résolues / ouvertes
Cartes à challenger
Recherche / identités émergentes / finalistes
Swaps + fenêtres + coût d'opportunité
Impact global / expérience
Points à tester
```
Réponse courte : **rôle perdu → gain → coût → verdict**.

# Tests de régression v18
Ces cas vérifient l’application de la méthode ; ils ne prescrivent aucune carte.

### A — Package d'accélération
Plusieurs accélérateurs one-shot permettent un commandant nettement plus tôt.
- **Échec** : « mauvais topdecks » puis cuts multiples sans établir si la sortie précoce est volontaire.
- **Réussite** : PACKAGE GATE → fonction « commandant précoce » → si importance inconnue et cuts différents, QUESTION GATE.

### B — Faux manque par quota
Aucun board wipe, mais prévention/pillow-fort/interaction récurrente/course existent.
- **Échec** : « 0 wipe = défaut structurel ».
- **Réussite** : démontrer une situation réaliste où ces moyens ne suffisent pas ; sinon wipe = candidate/hypothèse, pas manque acquis.

### C — Faux remplacement fonctionnel
Le cut fournit une ressource immédiatement ; l’add en fournit davantage après installation.
- **Échec** : « même fonction, upgrade ».
- **Réussite** : WINDOW GATE → fenêtre perdue → gain compensatoire réel.

### D — Synergie parfaite, expérience rejetée
Une carte déclenche une suppression asymétrique répétée à chaque occurrence du moteur.
- **Échec** : recommandation automatique car mécaniquement parfaite.
- **Réussite** : EXPERIENCE GATE → expérience cible ; question seulement si tolérance inconnue.

### E — Identité secondaire
Plusieurs cartes partagent un événement mécanique directement produit par le commandant.
- **Échec** : ajouter tribal/payoff générique sans comparer les intersections existantes.
- **Réussite** : tester jusqu’à trois identités émergentes, préférer celle qui récompense le moteur avec le moindre coût de slots, ou n’en retenir aucune.

# Checklist finale
- bonne version/zones, MAYBEBOARD exclu ;
- MODE correct ; hypothèses/contraintes ambiguës et questions seulement réellement décisionnelles ; aucune bifurcation ouverte absorbée arbitrairement en interactif ;
- bracket/niveau traduit en expérience cible ;
- packages/sous-plans détectés avant constitution ; PACKAGE GATE passé ; carte étrange jugée dans son package ;
- constitution définie avant swaps ; identité/nature/plans/moteur/tempo/paramètres clarifiés seulement autant que nécessaire ;
- liste neuve réauditée sans inertie ; cartes actives auditées, slot vide sur chacune, chaque NON comparé ou consciemment conservé ; voisins fonctionnels recherchés quand utiles ;
- aucun diagnostic par quota ; DIAGNOSTIC GATE passé ; flux/goulot démontré ;
- mana auditée par séquences, catégories de mana non interchangeables, couleurs réelles et sources conditionnelles correctement comptées ;
- réactivité/qualité de jeu et résilience évaluées sans imposer de densité ;
- QUESTION GATE appliqué à toute bifurcation nouvelle sans répéter les questions déjà résolues ;
- recherche large : faiblesses, intersections, identités émergentes sans les forcer, multiplicateurs, goulots, INCERTAIN/NON/FLEX, quatre dernières familles sorties, identité profonde, communauté comme signal ;
- faits Oracle portant les décisions vérifiés ; récent/peu joué traité avec incertitude appropriée ;
- WINDOW GATE passé ; fenêtre/tempo comparés ; chaque ADD a un CUT réel ; contre-test du CUT construit ;
- PACKAGE CUT GATE passé pour les cuts collectifs ; priorités explicites respectées ; cartes récentes non testées non remplacées pour simple plafond ;
- checkpoint constitution ; EXPERIENCE GATE pour synergies/locks/denial/déterminisme/raccourcis ; escalade cumulative comparée AVANT/APRÈS si significative ;
- passe finale adversariale, staples génériques justifiées, contradictions locales revues, test contrefactuel d’identité sans règle « tout tribal » ;
- mana/rôles/goulots réaudités après changements ; aucune fonction rare perdue ; expérience/bracket toujours cohérents ;
- convergence réelle : aucun NON, question ouverte, nouveau problème, conflit de mana ou nouvelle classe de candidat susceptible de changer le verdict ;
- **deck entier meilleur après les changements**.
