import { buildSpofProfile } from './spofModel.js'
import { buildComboAccessibility,buildVulnerabilityMatrix,buildGameQualityForecast } from './gameQuality.js'
import { buildThreatAnswerTimeline,buildAdaptiveRule0,buildAdvancedPodMatch } from './podIntelligence.js'

export function buildDeckIntelligence(result={},cards=[]){
  const spof=buildSpofProfile(result,cards),withSpof={...result,spof},comboAccessibility=buildComboAccessibility(withSpof,cards),withCombo={...withSpof,comboAccessibility},vulnerability=buildVulnerabilityMatrix(withCombo)
  return {modelVersion:'deck-intelligence-v1',spof,comboAccessibility,vulnerability,confidence:{productCalibration:'experimental'}}
}

export function buildPodIntelligence(decks=[]){
  const enriched=decks.filter(Boolean).map(d=>{
    const result=d.result||d.analysis||d,cards=d.cards||[],deckIntelligence=d.deckIntelligence||buildDeckIntelligence(result,cards)
    return {...result,...deckIntelligence}
  })
  const threatAnswer=buildThreatAnswerTimeline(enriched),adaptiveRule0=buildAdaptiveRule0(enriched),podMatch=buildAdvancedPodMatch(enriched),gameQuality=buildGameQualityForecast(enriched,podMatch,threatAnswer)
  return {modelVersion:'pod-intelligence-v1',decks:enriched,threatAnswer,adaptiveRule0,podMatch,gameQuality,confidence:{productCalibration:'experimental'},notes:['All P3/P4 conclusions remain evidence-bearing and experimental until P7 calibration.']}
}
