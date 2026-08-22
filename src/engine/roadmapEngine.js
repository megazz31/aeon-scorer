import { buildSpofProfile } from './spofModel.js'
import { buildComboAccessibility } from './comboAccessibility.js'
import { buildVulnerabilityMatrix,buildGameQualityForecast } from './gameQuality.js'
import { buildThreatAnswerTimeline,buildAdaptiveRule0,buildAdvancedPodMatch } from './podIntelligence.js'
import { buildAnswerProfile,buildThreatProfile } from './threatAnswerProfile.js'
import { buildClassThreatAnswerTimeline } from './threatAnswerTimeline.js'
import { buildAnswerDebt } from './answerDebt.js'
import { buildAgencyTimeline } from './agencyTimeline.js'

export function buildDeckIntelligence(result={},cards=[]){
  const spof=buildSpofProfile(result,cards),withSpof={...result,spof},comboAccessibility=buildComboAccessibility(withSpof,cards),withCombo={...withSpof,comboAccessibility},vulnerability=buildVulnerabilityMatrix(withCombo),answerProfile=buildAnswerProfile(withCombo,cards),threatProfile=buildThreatProfile({...withCombo,vulnerability},cards)
  return {modelVersion:'deck-intelligence-v4',spof,comboAccessibility,vulnerability,answerProfile,threatProfile,confidence:{productCalibration:'experimental',comboTiming:'piece-presence-v1'}}
}

const stripEvidenceMetric=m=>m?{score:Number(m.score||0),level:m.level||'low',method:m.method||null}:null
const safeThreat=x=>({
  modelVersion:x.modelVersion||null,id:x.id,family:x.family||null,strength:Number(x.strength||0),level:x.level||'low',answers:[...(x.answers||[])],
  sourceEvidence:(x.sourceEvidence||[]).map(e=>({kind:e.kind||null,id:e.id||null,score:e.score==null?null:Number(e.score),strength:e.strength==null?null:Number(e.strength)})),
  prerequisites:{known:(x.prerequisites?.known||[]).map(k=>({kind:k.kind||null,value:typeof k.value==='number'?Number(k.value):k.value??null})),unknown:[...(x.prerequisites?.unknown||[])]},
  temporalSource:x.temporalSource||null,temporalSemantics:x.temporalSemantics||null,timingStatus:x.timingStatus||null,milestones:x.milestones||{},criticalWindow:x.criticalWindow||{},
  turns:(x.turns||[]).map(p=>({turn:Number(p.turn),value:Number(p.value)})),confidence:x.confidence||{},
})
const safeComboTiming=t=>t?{modelVersion:t.modelVersion||null,status:t.status||'unsupported',metric:t.metric||null,executionStatus:t.executionStatus||'not-modeled',librarySize:Number(t.librarySize||0),requiredPieces:Number(t.requiredPieces||0),libraryPieces:Number(t.libraryPieces||0),commandZonePieces:Number(t.commandZonePieces||0),missingPieces:Number(t.missingPieces||0),windows:(t.windows||[]).map(w=>({turn:Number(w.turn),piecePresence:w.piecePresence==null?null:Number(w.piecePresence),rawDraws:Number(w.rawDraws||0)})),unsupportedReasons:[...(t.unsupportedReasons||[])],assumptions:[...(t.assumptions||[])]}:null
export function buildShareableIntelligence(result={},cards=[]){
  const deck=buildDeckIntelligence(result,cards),experience={modelVersion:result.experience?.modelVersion||null,dimensions:{},confidence:result.experience?.confidence||{}},friction={modelVersion:result.friction?.modelVersion||null,signals:{}},horizon={modelVersion:result.horizon?.modelVersion||null,curves:{}}
  for(const [key,value] of Object.entries(result.experience?.dimensions||{}))experience.dimensions[key]=stripEvidenceMetric(value)
  for(const [key,value] of Object.entries(result.friction?.signals||{}))friction.signals[key]=stripEvidenceMetric(value)
  for(const [key,value] of Object.entries(result.horizon?.curves||{}))horizon.curves[key]={semantics:value.semantics||null,points:(value.points||[]).map(p=>({turn:Number(p.turn),value:Number(p.value)})),milestones:value.milestones||{}}
  const spof={modelVersion:deck.spof.modelVersion,dependencies:{},highest:deck.spof.highest?{kind:deck.spof.highest.kind,score:deck.spof.highest.score,level:deck.spof.highest.level,method:deck.spof.highest.method}:null}
  for(const [key,value] of Object.entries(deck.spof.dependencies||{}))spof.dependencies[key]=stripEvidenceMetric(value)
  const comboAccessibility={modelVersion:deck.comboAccessibility.modelVersion,timing:deck.comboAccessibility.timing||null,lines:(deck.comboAccessibility.lines||[]).map(x=>({score:x.score,level:x.level,commanderPieces:x.commanderPieces,method:x.method,timing:safeComboTiming(x.timing)})),highest:deck.comboAccessibility.highest?{score:deck.comboAccessibility.highest.score,level:deck.comboAccessibility.highest.level,commanderPieces:deck.comboAccessibility.highest.commanderPieces,method:deck.comboAccessibility.highest.method,timing:safeComboTiming(deck.comboAccessibility.highest.timing)}:null}
  const vulnerability={modelVersion:deck.vulnerability.modelVersion,classes:{},highest:(deck.vulnerability.highest||[]).map(x=>({kind:x.kind,score:x.score,level:x.level,method:x.method}))}
  for(const [key,value] of Object.entries(deck.vulnerability.classes||{}))vulnerability.classes[key]=stripEvidenceMetric(value)
  const answerProfile={modelVersion:deck.answerProfile.modelVersion,interactionCards:deck.answerProfile.interactionCards,classes:{}}
  for(const [key,value] of Object.entries(deck.answerProfile.classes||{}))answerProfile.classes[key]={count:value.count,density:value.density,availabilityScale:value.availabilityScale,meanManaValue:value.meanManaValue,earliestManaTurn:value.earliestManaTurn,timingMethod:value.timingMethod,level:value.level,turns:(value.turns||[]).map(p=>({turn:Number(p.turn),value:Number(p.value)}))}
  const safeThreats=(deck.threatProfile.threats||[]).map(safeThreat),threatProfile={modelVersion:deck.threatProfile.modelVersion,threatObjectModel:deck.threatProfile.threatObjectModel||null,threats:safeThreats,objects:safeThreats}
  return {modelVersion:'share-intelligence-v4',experience,friction,horizon,spof,comboAccessibility,vulnerability,answerProfile,threatProfile,confidence:{productCalibration:'experimental',comboTiming:'piece-presence-v1'},privacy:{decklist:false,oracle:false,evidenceCards:false,comboPieceNames:false}}
}

function suppliedDeckIntelligence(result){
  if(!result?.spof&&!result?.comboAccessibility&&!result?.vulnerability&&!result?.answerProfile&&!result?.threatProfile)return null
  const comboV2=result?.comboAccessibility?.modelVersion==='combo-access-v2'
  return {modelVersion:comboV2?'deck-intelligence-v4':'deck-intelligence-v3',spof:result.spof||{dependencies:{}},comboAccessibility:result.comboAccessibility||{lines:[]},vulnerability:result.vulnerability||{classes:{}},answerProfile:result.answerProfile||{classes:{}},threatProfile:result.threatProfile||{threats:[]},confidence:{productCalibration:'experimental',comboTiming:comboV2?'piece-presence-v1':'legacy'}}
}
export function buildPodIntelligence(decks=[],options={}){
  const enriched=decks.filter(Boolean).map(d=>{
    const result=d.result||d.analysis||d,cards=d.cards||[],deckIntelligence=d.deckIntelligence||suppliedDeckIntelligence(result)||buildDeckIntelligence(result,cards)
    return {...result,...deckIntelligence}
  })
  const threatAnswer=buildClassThreatAnswerTimeline(enriched)||buildThreatAnswerTimeline(enriched),answerDebt=buildAnswerDebt(enriched),agencyTimeline=buildAgencyTimeline(enriched,threatAnswer),adaptiveRule0=buildAdaptiveRule0(enriched,options.rule0Answers||{}),podMatch=buildAdvancedPodMatch(enriched,threatAnswer,adaptiveRule0.intentOverlay),gameQuality=buildGameQualityForecast(enriched,podMatch,threatAnswer),answerTimingV2=['threat-answer-v3','threat-answer-v4'].includes(threatAnswer?.modelVersion),modelVersion=agencyTimeline?'pod-intelligence-v5':answerTimingV2?'pod-intelligence-v4':'pod-intelligence-v3',comboTimingV2=enriched.some(r=>r?.comboAccessibility?.modelVersion==='combo-access-v2')
  return {modelVersion,decks:enriched,threatAnswer,answerDebt,agencyTimeline,adaptiveRule0,podMatch,gameQuality,confidence:{productCalibration:'experimental',declaredIntent:adaptiveRule0.intentOverlay?.answersApplied?'applied':'not-applied',answerTiming:answerTimingV2?'class-specific-v2':'legacy',threatObjects:enriched.some(r=>r?.threatProfile?.threatObjectModel)?'v1':'legacy',agency:agencyTimeline?'diagnostic-v1':'unavailable',comboTiming:comboTimingV2?'piece-presence-v1':'legacy'},notes:[answerTimingV2?'Answer Timing V2 uses actual answer-card counts and mana-value gating under Temporal V2 first-access evidence.':'Legacy/fallback answer timing remains active for this pod.',threatAnswer?.modelVersion==='threat-answer-v4'?'Threat–Answer V4 preserves all Threat Object windows while retaining the historical worst-window surface.':'Threat–Answer uses the best available class-specific compatibility surface.','Agency Timeline V1 is diagnostic only; it does not modify Pod Match, Game Quality or Aeon power.',comboTimingV2?'Combo Accessibility V2 adds T5/T7/T9 raw-draw piece-presence evidence; execution probability, tutors, mulligan selection and special prerequisites remain explicitly unmodeled.':'Combo timing remains on the legacy structural-only surface.','Answer Debt summarizes class-specific under-coverage without introducing a new probability model.','Adaptive Rule 0 answers alter only the explicit declared-intent compatibility overlay; they never rewrite detected capability or semantic truth.','All P3/P4 conclusions remain evidence-bearing and experimental until P7 calibration.']}
}
