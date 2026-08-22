import { buildSpofProfile } from './spofModel.js'
import { buildComboAccessibility,buildVulnerabilityMatrix,buildGameQualityForecast } from './gameQuality.js'
import { buildThreatAnswerTimeline,buildAdaptiveRule0,buildAdvancedPodMatch } from './podIntelligence.js'

export function buildDeckIntelligence(result={},cards=[]){
  const spof=buildSpofProfile(result,cards),withSpof={...result,spof},comboAccessibility=buildComboAccessibility(withSpof,cards),withCombo={...withSpof,comboAccessibility},vulnerability=buildVulnerabilityMatrix(withCombo)
  return {modelVersion:'deck-intelligence-v1',spof,comboAccessibility,vulnerability,confidence:{productCalibration:'experimental'}}
}

const stripEvidenceMetric=m=>m?{score:Number(m.score||0),level:m.level||'low',method:m.method||null}:null
export function buildShareableIntelligence(result={},cards=[]){
  const deck=buildDeckIntelligence(result,cards),experience={modelVersion:result.experience?.modelVersion||null,dimensions:{},confidence:result.experience?.confidence||{}},friction={modelVersion:result.friction?.modelVersion||null,signals:{}},horizon={modelVersion:result.horizon?.modelVersion||null,curves:{}}
  for(const [key,value] of Object.entries(result.experience?.dimensions||{}))experience.dimensions[key]=stripEvidenceMetric(value)
  for(const [key,value] of Object.entries(result.friction?.signals||{}))friction.signals[key]=stripEvidenceMetric(value)
  for(const [key,value] of Object.entries(result.horizon?.curves||{}))horizon.curves[key]={semantics:value.semantics||null,points:(value.points||[]).map(p=>({turn:Number(p.turn),value:Number(p.value)})),milestones:value.milestones||{}}
  const spof={modelVersion:deck.spof.modelVersion,dependencies:{},highest:deck.spof.highest?{kind:deck.spof.highest.kind,score:deck.spof.highest.score,level:deck.spof.highest.level,method:deck.spof.highest.method}:null}
  for(const [key,value] of Object.entries(deck.spof.dependencies||{}))spof.dependencies[key]=stripEvidenceMetric(value)
  const comboAccessibility={modelVersion:deck.comboAccessibility.modelVersion,lines:(deck.comboAccessibility.lines||[]).map(x=>({name:x.name,score:x.score,level:x.level,commanderPieces:x.commanderPieces,method:x.method})),highest:deck.comboAccessibility.highest?{name:deck.comboAccessibility.highest.name,score:deck.comboAccessibility.highest.score,level:deck.comboAccessibility.highest.level}:null}
  const vulnerability={modelVersion:deck.vulnerability.modelVersion,classes:{},highest:(deck.vulnerability.highest||[]).map(x=>({kind:x.kind,score:x.score,level:x.level,method:x.method}))}
  for(const [key,value] of Object.entries(deck.vulnerability.classes||{}))vulnerability.classes[key]=stripEvidenceMetric(value)
  return {modelVersion:'share-intelligence-v1',experience,friction,horizon,spof,comboAccessibility,vulnerability,confidence:{productCalibration:'experimental'},privacy:{decklist:false,oracle:false,evidenceCards:false}}
}

function suppliedDeckIntelligence(result){
  if(!result?.spof&&!result?.comboAccessibility&&!result?.vulnerability)return null
  return {modelVersion:'deck-intelligence-v1',spof:result.spof||{dependencies:{}},comboAccessibility:result.comboAccessibility||{lines:[]},vulnerability:result.vulnerability||{classes:{}},confidence:{productCalibration:'experimental'}}
}
export function buildPodIntelligence(decks=[]){
  const enriched=decks.filter(Boolean).map(d=>{
    const result=d.result||d.analysis||d,cards=d.cards||[],deckIntelligence=d.deckIntelligence||suppliedDeckIntelligence(result)||buildDeckIntelligence(result,cards)
    return {...result,...deckIntelligence}
  })
  const threatAnswer=buildThreatAnswerTimeline(enriched),adaptiveRule0=buildAdaptiveRule0(enriched),podMatch=buildAdvancedPodMatch(enriched),gameQuality=buildGameQualityForecast(enriched,podMatch,threatAnswer)
  return {modelVersion:'pod-intelligence-v1',decks:enriched,threatAnswer,adaptiveRule0,podMatch,gameQuality,confidence:{productCalibration:'experimental'},notes:['All P3/P4 conclusions remain evidence-bearing and experimental until P7 calibration.']}
}
