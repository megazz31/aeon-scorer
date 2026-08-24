const LEVELS={
  en:{low:'Low',moderate:'Moderate',high:'High','very-high':'Very high',close:'Close',playable:'Playable',mismatch:'Needs discussion'},
  fr:{low:'Faible',moderate:'Modéré',high:'Élevé','very-high':'Très élevé',close:'Proche',playable:'Jouable',mismatch:'À discuter'},
}

const METRICS={
  en:{
    tempo:'Setup pace',explosiveness:'Explosive acceleration',volatility:'Output variability',interaction:'Interaction access',resilience:'Recovery capacity',inevitability:'Long-game pressure',dependency:'General dependency','turn Complexity':'Turn complexity',turnComplexity:'Turn complexity',
    resourceDenial:'Resource denial',theft:'Theft / control',forcedDiscardSacrifice:'Forced discard / sacrifice',lockPotential:'Lock potential',longSequencing:'Long / complex turns',
    commander:'Commander dependency',engine:'Engine dependency',enchantment:'Enchantment dependency',graveyard:'Graveyard dependency',artifact:'Artifact dependency',combo:'Combo dependency',
    exileInteraction:'Vulnerable to exile',enchantmentSuppression:'Vulnerable to enchantment removal',graveyardHate:'Vulnerable to graveyard hate',artifactSuppression:'Vulnerable to artifact removal',countermagic:'Vulnerable to countermagic',
    speed:'Setup pace',consistency:'Output regularity',synergy:'Synergy',resilienceDimension:'Resilience',interactionDimension:'Available interaction',explosivenessDimension:'Explosiveness',
  },
  fr:{
    tempo:'Rythme de mise en place',explosiveness:'Accélération explosive',volatility:'Variabilité des sorties',interaction:'Accès à l’interaction',resilience:'Capacité de reprise',inevitability:'Pression à long terme',dependency:'Dépendance générale','turn Complexity':'Complexité des tours',turnComplexity:'Complexité des tours',
    resourceDenial:'Déni de ressources',theft:'Vol / prise de contrôle',forcedDiscardSacrifice:'Défausse / sacrifice forcés',lockPotential:'Potentiel de verrouillage',longSequencing:'Tours longs / complexes',
    commander:'Dépendance au commandant',engine:'Dépendance au moteur',enchantment:'Dépendance aux enchantements',graveyard:'Dépendance au cimetière',artifact:'Dépendance aux artefacts',combo:'Dépendance aux combos',
    exileInteraction:'Sensible à l’exil',enchantmentSuppression:'Sensible aux anti-enchantements',graveyardHate:'Sensible à la hate cimetière',artifactSuppression:'Sensible aux anti-artefacts',countermagic:'Sensible aux contresorts',
    speed:'Rythme de mise en place',consistency:'Régularité des sorties',synergy:'Synergies',resilienceDimension:'Résilience',interactionDimension:'Interaction disponible',explosivenessDimension:'Capacité d’explosion',
  },
}

const TAGS={
  en:{draw:'Draw',tutor:'Tutor','repeatable-tutor':'Repeatable tutor','fast-mana':'Fast mana','burst-mana':'Burst mana',removal:'Removal','tempo-interaction':'Tempo interaction',counterspell:'Counterspell',protection:'Protection',recursion:'Recursion',tokens:'Tokens','token-payoff':'Token payoff','token-doubler':'Token doubler','sac-outlet':'Sacrifice outlet','death-payoff':'Death payoff',etb:'ETB value',blink:'Blink',constellation:'Constellation','artifact-payoff':'Artifact payoff',landfall:'Landfall','counter-producer':'Counter producer','counter-payoff':'Counter payoff','counter-doubler':'Counter doubler',spellslinger:'Spellslinger','exile-cast':'Cast from exile','exile-payoff':'Exile payoff',cheat:'Cheat into play',free:'Free / alternate cost',stax:'Stax','extra-turn':'Extra turn','extra-combat':'Extra combat',win:'Win condition','trigger-doubler':'Trigger doubler',lifegain:'Life gain','life-payoff':'Life payoff',wipe:'Board wipe','graveyard-setup':'Graveyard setup'},
  fr:{draw:'Pioche',tutor:'Tuteur','repeatable-tutor':'Tuteur répétable','fast-mana':'Mana très rapide','burst-mana':'Mana ponctuel',removal:'Gestion','tempo-interaction':'Interaction tempo',counterspell:'Contresort',protection:'Protection',recursion:'Récursion',tokens:'Jetons','token-payoff':'Valorise les jetons','token-doubler':'Double les jetons','sac-outlet':'Moteur de sacrifice','death-payoff':'Valorise les morts',etb:'Valeur à l’arrivée',blink:'Blink',constellation:'Constellation','artifact-payoff':'Valorise les artefacts',landfall:'Landfall','counter-producer':'Produit des marqueurs','counter-payoff':'Valorise les marqueurs','counter-doubler':'Double les marqueurs',spellslinger:'Sorts non-créature','exile-cast':'Joue depuis l’exil','exile-payoff':'Valorise l’exil',cheat:'Met en jeu sans coût normal',free:'Coût alternatif / gratuit',stax:'Restriction / stax','extra-turn':'Tour supplémentaire','extra-combat':'Combat supplémentaire',win:'Condition de victoire','trigger-doubler':'Double les capacités déclenchées',lifegain:'Gain de vie','life-payoff':'Valorise les points de vie',wipe:'Nettoyage de table','graveyard-setup':'Prépare le cimetière'},
}

const PACKAGES={
  en:{'early-commander':'Commander acceleration','blink-etb':'Blink / ETB','constellation':'Enchantments / constellation',tokens:'Tokens',sacrifice:'Sacrifice / death',graveyard:'Graveyard / recursion',lands:'Lands / landfall',counters:'Counters',spells:'Spellslinger',exile:'Cast from exile',artifacts:'Artifacts'},
  fr:{'early-commander':'Accélération du commandant','blink-etb':'Blink / arrivées en jeu','constellation':'Enchantements / constellation',tokens:'Jetons',sacrifice:'Sacrifice / morts',graveyard:'Cimetière / récursion',lands:'Terrains / landfall',counters:'Marqueurs',spells:'Sorts non-créature',exile:'Jeu depuis l’exil',artifacts:'Artefacts'},
}

const METHODS={
  en:{'cumulative-first-access':'First reliable access','semantic-proxy+paired-suppression-evidence':'Semantic evidence + paired stress test','piece-presence-v1':'Raw combo-piece presence','structured-v1':'Structured prerequisites','first-access-v2':'First-access simulation'},
  fr:{'cumulative-first-access':'Premier accès fiable','semantic-proxy+paired-suppression-evidence':'Preuves sémantiques + test de résistance','piece-presence-v1':'Présence brute des pièces de combo','structured-v1':'Prérequis structurés','first-access-v2':'Simulation de premier accès'},
}

const PRODUCT={
  en:{compare:'Compare 2–4 decks',tables:'Build balanced tables of 4',tournament:'Build a tournament bracket',share:'Share this deck',lab:'Aeon Lab',labSub:'Experimental diagnostics'},
  fr:{compare:'Comparer 2–4 decks',tables:'Former des tables de 4',tournament:'Créer un arbre de tournoi',share:'Partager ce deck',lab:'Laboratoire Aeon',labSub:'Diagnostics expérimentaux'},
}

const hiddenTags=new Set(['land','creature','enchantment','artifact','instant','sorcery','mana','sacrifice'])
const langOf=lang=>lang==='fr'?'fr':'en'
const camel=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').trim()

export function productLabel(key,lang='en'){return PRODUCT[langOf(lang)][key]||key}
export function levelLabel(level,lang='en'){return LEVELS[langOf(lang)][level]||camel(level)}
export function metricLabel(key,lang='en'){const l=langOf(lang),normalized=camel(key);return METRICS[l][key]||METRICS[l][normalized]||normalized.charAt(0).toUpperCase()+normalized.slice(1)}
export function packageLabel(key,fallback='',lang='en'){return PACKAGES[langOf(lang)][key]||fallback||metricLabel(key,lang)}
export function tagLabel(key,lang='en'){return TAGS[langOf(lang)][key]||camel(key)}
export function visibleTagLabels(tags=[],lang='en',limit=5){return [...new Set(tags)].filter(x=>!hiddenTags.has(x)&&!String(x).startsWith('counter-kind:')).map(x=>tagLabel(x,lang)).slice(0,limit)}
export function methodLabel(method,lang='en'){if(!method)return '';return METHODS[langOf(lang)][method]||''}
export function scoreLevel(score,lang='en'){const n=Number(score)||0;return levelLabel(n>=75?'very-high':n>=55?'high':n>=30?'moderate':'low',lang)}
export function packageStrength(score,lang='en'){const n=Number(score)||0;const key=n>=85?'very-high':n>=65?'high':n>=40?'moderate':'low';return levelLabel(key,lang)}
export function influenceLabel(value,lang='en'){const n=Number(value)||0;return langOf(lang)==='fr'?`indice ${n.toFixed(1)}`:`index ${n.toFixed(1)}`}
export function tableFitLabel(fit,lang='en'){const l=langOf(lang);return ({close:l==='fr'?'Plages de puissance très proches':'Very close power ranges',playable:l==='fr'?'Écart de puissance jouable':'Playable power spread',mismatch:l==='fr'?'Écart à discuter avant la partie':'Power gap to discuss','need-more':l==='fr'?'Ajoute des decks':'Add decks'})[fit]||fit}
