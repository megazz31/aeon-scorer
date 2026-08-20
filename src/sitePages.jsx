export const SITE_META={
  '/':{
    title:'Aeon Scorer — MTG Commander Deck Power Level Analyzer',
    description:'Estimate the power of a Magic: The Gathering Commander deck with Monte Carlo simulations, card synergies, mana access and a readable power distribution.'
  },
  '/pourquoi':{
    title:'Pourquoi Aeon Scorer ? — Mesurer la puissance d’un deck Commander',
    description:'Pourquoi un simple “power level 7” ne suffit pas, et comment Aeon Scorer compare les sorties réelles des decks MTG Commander.'
  },
  '/methodologie':{
    title:'Méthodologie — Aeon Scorer',
    description:'Comment Aeon Scorer analyse un deck Commander : rôles des cartes, packages, accès au mana, Monte Carlo, calibration et limites connues.'
  },
  '/a-propos':{
    title:'À propos — Aeon Scorer',
    description:'L’origine d’Aeon Scorer, un projet indépendant pour mieux comparer la puissance des decks Magic: The Gathering Commander.'
  }
}

function PageHead({eyebrow,title,lead}){return <header className="contentHead"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{lead}</p></div></header>}
function Callout({children}){return <div className="contentCallout">{children}</div>}

export function WhyPage({navigate}){
  return <div className="contentPage">
    <PageHead eyebrow="POURQUOI AEON SCORER ?" title="Parce que « mon deck est un 7 » ne veut plus dire grand-chose." lead="Aeon Scorer est né d’un besoin simple : pouvoir comparer deux decks Commander avant une partie sans réduire leur puissance à un chiffre arbitraire ou à une impression de joueur."/>

    <section className="panel proseGrid">
      <div><h2>Le problème</h2><p>Deux decks peuvent recevoir la même note subjective et pourtant produire des parties radicalement différentes. L’un peut être régulier et plafonner bas ; l’autre peut être lent la plupart du temps mais avoir des sorties capables de tuer très tôt.</p><p>Un bracket ou une note unique décrit mal cette différence. Pour équilibrer une table, ce qui compte n’est pas seulement <em>la moyenne</em>, mais aussi la façon dont le deck se comporte quand il pioche mal, normalement ou très bien.</p></div>
      <div><h2>L’idée</h2><p>Aeon Scorer transforme une decklist Commander en une <b>distribution de puissance</b>. Le résultat principal tient volontairement en quatre valeurs lisibles :</p><div className="fourMetricExplainer"><span><b>Médiane</b><small>puissance habituelle</small></span><span><b>P20</b><small>sortie basse</small></span><span><b>P80</b><small>sortie haute</small></span><span><b>Pic</b><small>haut de potentiel</small></span></div></div>
    </section>

    <Callout><b>Exemple :</b> un deck à <strong>55 [45–65] · pic 85</strong> n’est pas équivalent à un deck à <strong>55 [51–60] · pic 68</strong>. Leur médiane est identique, mais l’expérience de table ne l’est pas.</Callout>

    <section className="panel prose"><h2>Ce qu’Aeon Scorer cherche à répondre</h2><p>La question n’est pas « ce joueur sait-il bien construire ? » ni « ce deck appartient-il à tel bracket ? ». La question est : <b>quelles sorties ce deck est-il structurellement capable de produire, avec quelle régularité, et à quelle vitesse ?</b></p><p>Le score n’est donc pas un winrate. Un 66 ne gagne pas 66 % de ses parties. C’est une échelle de puissance structurelle calibrée pour faciliter la discussion de table.</p></section>

    <section className="panel prose"><h2>Le but pratique</h2><p>Avant une partie, rapproche d’abord les médianes. Ensuite regarde si les plages P20–P80 se chevauchent et si un deck possède un pic ou une combo qui change fortement son potentiel. L’objectif est de remplacer le débat « moi je pense que mon deck est un 7 » par une information commune, explicable et contestable.</p><button className="inlineCta" onClick={()=>navigate('/')}>Analyser un deck</button></section>
  </div>
}

export function MethodPage({navigate}){
  return <div className="contentPage">
    <PageHead eyebrow="MÉTHODOLOGIE" title="Un score explicable, pas une boîte noire." lead="Aeon Scorer ne mémorise pas des decklists et n’attribue pas une note par nom de carte. Il construit des rôles fonctionnels, des packages et des fenêtres d’accès, puis simule des milliers de séquences."/>

    <section className="methodSteps">
      <article className="panel"><span>01</span><h2>Comprendre les cartes</h2><p>Le texte Oracle et le type de chaque carte sont convertis en rôles fonctionnels : pioche, interaction, tutor, fast mana, blink, récursion, payoff tokens, etc. Le moteur essaie de distinguer le rôle réel d’une carte d’un simple mot cité dans son texte.</p></article>
      <article className="panel"><span>02</span><h2>Construire les packages</h2><p>Les rôles sont reliés en sous-systèmes producteur → payoff : Blink/ETB, Constellation, tokens, sacrifice, cimetière, marqueurs, accélération du commandant… Un package opérationnel exige des pièces distinctes et une fenêtre de mana plausible.</p></article>
      <article className="panel"><span>03</span><h2>Simuler l’accès</h2><p>Des milliers de séquences Monte Carlo modélisent les mains, mulligans Commander, terrains, mana persistant ou burst, accès au commandant, interaction et packages jusqu’au tour 7.</p></article>
      <article className="panel"><span>04</span><h2>Produire une distribution</h2><p>Les séquences deviennent une médiane, un P20, un P80 et un pic. Les dimensions de vitesse, consistance, explosivité, synergie, interaction et reprise servent ensuite à expliquer le résultat.</p></article>
    </section>

    <section className="panel prose"><h2>Calibration et validation v3.1</h2><p>La v3.1 a été validée sur un corpus réel de <b>38 decks</b> : 15 précons, 15 listes cEDH avec 15 commandants distincts et 8 decks utilisateur/publics. Les précons couvrent plusieurs années pour éviter un corpus uniquement ancien.</p><p>Le même head final a passé les tests micro-sémantiques, les tests métamorphiques, un audit adversarial, le build production, les benchmarks à 1 800 et 3 200 séquences ainsi qu’un test de convergence. Les repères centraux du corpus final sont environ <b>49 pour les précons</b> et <b>78 pour les listes cEDH</b>. Ce sont des repères, pas des seuils universels.</p></section>

    <section className="panel prose"><h2>Ce que le moteur ne prétend pas faire</h2><p>Aeon Scorer n’est pas un moteur complet des règles de Magic. Il ne simule pas une vraie table à quatre, la politique, toutes les cibles, une stack complète ou toutes les décisions adverses. Les tuteurs sont détectés mais leurs cibles ne sont pas encore exécutées dynamiquement. Certaines mécaniques de coûts alternatifs et de mana très contextuel restent approximées.</p><p>La bibliothèque de combos est volontairement haute confiance et non exhaustive : aucune combo affichée ne signifie pas « aucune combo possible ».</p></section>

    <section className="panel prose faq"><h2>Questions fréquentes</h2><details><summary>66 veut dire 66 % de winrate ?</summary><p>Non. 66 est une position sur l’échelle structurelle Aeon Scorer. Le résultat d’une partie dépend aussi des adversaires, du matchup, de la politique et du pilotage.</p></details><details><summary>Pourquoi un précon peut-il avoir 100 en synergie ?</summary><p>Parce que la synergie mesure la cohésion du plan détecté, pas la puissance absolue. Un deck peut exécuter très proprement un plan lent et peu explosif.</p></details><details><summary>À quoi sert la couverture d’analyse ?</summary><p>C’est un contrôle qualité : elle mesure la part des données que le moteur a pu comprendre et classer. Ce n’est pas un pourcentage de certitude. Elle reste donc dans le diagnostic, sauf lorsqu’elle devient assez basse pour mériter une alerte.</p></details><details><summary>Comment comparer deux decks ?</summary><p>Commence par la médiane, puis compare P20–P80 et le pic. Vérifie ensuite les combos connues et, en cas de doute, ouvre le diagnostic détaillé.</p></details></section>

    <button className="inlineCta" onClick={()=>navigate('/')}>Tester une decklist</button>
  </div>
}

export function AboutPage(){
  return <div className="contentPage">
    <PageHead eyebrow="À PROPOS" title="Un projet indépendant pour les tables Commander." lead="Aeon Scorer est porté par megazz31 et développé publiquement sur GitHub. Le projet part d’une frustration de joueur : il est difficile de parler sérieusement de puissance de deck avec des catégories trop larges ou des notes purement subjectives."/>

    <section className="panel prose"><h2>Pourquoi le projet est public</h2><p>Le moteur est visible pour que ses choix puissent être compris, critiqués et améliorés. Les erreurs de détection, limites mécaniques et calibrations ne sont pas cachées : elles font partie du travail.</p><p>Le dépôt public permet aussi aux joueurs de signaler un deck mal interprété, proposer un cas de test ou ouvrir une Pull Request. Le code de production reste contrôlé par le propriétaire du dépôt : public ne signifie pas que n’importe qui peut modifier directement <code>main</code>.</p></section>

    <section className="panel prose"><h2>Principes du projet</h2><ul><li><b>Explicable :</b> un score doit pouvoir être relié à des cartes, packages et fenêtres d’accès.</li><li><b>Probabiliste :</b> un deck n’a pas une seule sortie ; il a une distribution.</li><li><b>Pratique :</b> l’écran principal doit aider à choisir une table, pas noyer le joueur sous des métriques.</li><li><b>Révisable :</b> un test qui révèle une erreur doit pouvoir faire évoluer le modèle.</li></ul></section>

    <section className="panel projectLinks"><div><span className="eyebrow">PROJET</span><h2>Aeon Scorer v3.1</h2><p>JavaScript · React/Vite · Scryfall · Monte Carlo · Commander/EDH</p></div><div className="linkStack"><a href="https://aeon-scorer.vercel.app" target="_blank" rel="noreferrer">Ouvrir l’application ↗</a><a href="https://github.com/megazz31/aeon-scorer" target="_blank" rel="noreferrer">Voir le code sur GitHub ↗</a></div></section>
  </div>
}
