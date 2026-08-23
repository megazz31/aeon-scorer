export const COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION='combo-execution-eligibility-v1'

const key=s=>String(s||'').trim().toLowerCase()

const REQUIREMENT_DEFS={
  'library-empty-condition':{category:'state',zone:'library',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'library-state-transition-not-modeled'},
  'singleton-name-constraint':{category:'rules',zone:'library',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'card-name-selection-rule-not-modeled'},
  'stack-sequencing':{category:'sequencing',zone:'stack',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'stack-order-not-modeled'},
  'protection-window':{category:'protection',zone:'stack',requiredForExecution:false,state:'unknown',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'opponent-response-window-not-modeled'},
  'imprint-state':{category:'state',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'imprint-link-state-not-modeled'},
  'nonland-mana-positive-loop':{category:'resource',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'net-mana-loop-not-modeled'},
  'activation-cost':{category:'activation',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'activation-sequence-not-modeled'},
  'x-cost':{category:'mana',zone:'stack',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'dynamic-x-payment-not-modeled'},
  'counter-threshold':{category:'state',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'counter-state-not-modeled'},
  'lifelink-activation':{category:'activation',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'granted-ability-activation-not-modeled'},
  'life-change-trigger':{category:'state',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'life-event-trigger-chain-not-modeled'},
  'both-permanents-survive':{category:'state',zone:'battlefield',requiredForExecution:true,state:'unknown',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'persistent-board-state-not-modeled'},
  'color-setting-state':{category:'state',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'chosen-color-state-not-modeled'},
  'replacement-effect-risk':{category:'rules',zone:'battlefield',requiredForExecution:false,state:'unknown',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'replacement-effects-not-modeled'},
  'graveyard-zone-piece':{category:'zone',zone:'graveyard',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'graveyard-piece-position-not-modeled'},
  'aura-targeting-sequence':{category:'sequencing',zone:'stack',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'aura-target-sequence-not-modeled'},
  'loop-exit-condition':{category:'recovery',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'loop-exit-state-not-modeled'},
  'graveyard-resource-threshold':{category:'resource',zone:'graveyard',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'graveyard-resource-count-not-modeled'},
  'escape-cost':{category:'resource',zone:'graveyard',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'escape-payment-not-modeled'},
  'storm-count':{category:'state',zone:'stack',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'storm-sequence-count-not-modeled'},
  'mana-loop':{category:'resource',zone:'battlefield',requiredForExecution:true,state:'unsupported',engineCanEvaluate:false,evidenceSource:'known-combo-catalog',blockerReason:'recursive-mana-loop-not-modeled'},
  'execution-prerequisites-not-modeled':{category:'rules',zone:null,requiredForExecution:true,state:'unknown',engineCanEvaluate:false,evidenceSource:'uncatalogued-line',blockerReason:'line-specific-execution-contract-unknown'},
}

const LINE_REQUIREMENTS={
  'thoracle + consultation':['library-empty-condition','stack-sequencing','protection-window'],
  'thoracle + pact':['library-empty-condition','singleton-name-constraint','stack-sequencing','protection-window'],
  'dramatic scepter':['imprint-state','nonland-mana-positive-loop','activation-cost','protection-window'],
  'heliod ballista':['x-cost','counter-threshold','lifelink-activation','protection-window'],
  'exquisite bond':['life-change-trigger','both-permanents-survive'],
  'exquisite vito':['life-change-trigger','both-permanents-survive'],
  'painter stone':['activation-cost','color-setting-state','replacement-effect-risk'],
  'worldgorger':['graveyard-zone-piece','aura-targeting-sequence','loop-exit-condition'],
  'breach freeze':['graveyard-resource-threshold','escape-cost','storm-count','mana-loop'],
}

export function comboRequirementIds(name){return [...(LINE_REQUIREMENTS[key(name)]||['execution-prerequisites-not-modeled'])]}

const requirement=(id,overrides={})=>({id,...REQUIREMENT_DEFS[id],...overrides})

export function buildComboExecutionEligibility(comboName,timing={}){
  const pieceSupported=timing?.status==='piece-presence-supported',missing=Number(timing?.missingPieces||0),catalogIds=comboRequirementIds(comboName)
  const requirements=[
    requirement('piece-data-resolved',{category:'access',zone:'library-and-command-zone',requiredForExecution:true,state:missing?'unsupported':'known',engineCanEvaluate:true,evidenceSource:'combo-piece-timing-v1',blockerReason:missing?'missing-piece-data':null}),
    requirement('piece-presence-window',{category:'access',zone:'library',requiredForExecution:true,state:pieceSupported?'known':'unsupported',engineCanEvaluate:pieceSupported,evidenceSource:'combo-piece-timing-v1',blockerReason:pieceSupported?null:'piece-presence-unavailable'}),
    ...catalogIds.map(id=>requirement(id)),
  ]
  const blockers=requirements.filter(r=>r.requiredForExecution&&r.state!=='known').map(r=>r.id),required=requirements.filter(r=>r.requiredForExecution),counts={known:0,unknown:0,unsupported:0,'not-applicable':0}
  for(const r of requirements)counts[r.state]=(counts[r.state]||0)+1
  return {
    modelVersion:COMBO_EXECUTION_ELIGIBILITY_MODEL_VERSION,
    status:blockers.length?'blocked':'requirements-known-not-promoted',
    exactExecutionTiming:'blocked',
    executionClaim:'not-emitted',
    piecePresenceStatus:timing?.status||'unavailable',
    requirements,
    blockers,
    summary:{total:requirements.length,required:required.length,requiredKnown:required.filter(r=>r.state==='known').length,...counts},
    confidence:{catalog:LINE_REQUIREMENTS[key(comboName)]?'known-line':'generic-boundary',executionEvaluation:'not-promoted',productCalibration:'experimental'},
    notes:['Requirement state describes Aeon evidence coverage, not whether the player currently satisfies the requirement in a real game.','A requirement marked unsupported/unknown blocks exact execution timing only when it is required for execution.','Protection/replacement-risk context may remain useful evidence without being a strict execution prerequisite.'],
  }
}
