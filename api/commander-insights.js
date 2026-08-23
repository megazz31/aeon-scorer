const SPELLBOOK='https://backend.commanderspellbook.com'
const clean=v=>String(v??'').trim()
function parseLines(text=''){
  const out=[];for(const raw of String(text).split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('//')||line.startsWith('#'))continue;const m=line.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?(?:\s+#.*)?$/i);if(m){const quantity=Math.max(1,Number(m[1])||1),card=m[2].trim();if(card)out.push({card,quantity})}}return out
}
function cardName(x){return clean(x?.card?.name||x?.card||x?.name||x?.card_name)}
function comboCards(v){const raw=v?.uses||v?.cards||v?.card_list||v?.cardList||[];if(Array.isArray(raw))return raw.map(cardName).filter(Boolean);return []}
function comboText(v){const produces=v?.produces||v?.results||[];if(Array.isArray(produces))return produces.map(x=>clean(x?.feature?.name||x?.name||x?.description||x)).filter(Boolean).join(' · ');return clean(produces)}
function normalizeVariant(v){return {id:clean(v?.id||v?.variant_id),cards:comboCards(v),result:comboText(v),manaNeeded:clean(v?.mana_needed||v?.manaNeeded),description:clean(v?.description||v?.other_prerequisites||v?.otherPrerequisites),popularity:Number(v?.popularity||v?.popularity_count||0)||0}}
function listFrom(section){const x=section?.results||section?.variants||section||[];return Array.isArray(x)?x.map(normalizeVariant).filter(v=>v.cards.length).slice(0,40):[]}
async function post(path,body,signal){const r=await fetch(`${SPELLBOOK}${path}`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','User-Agent':'AeonScorer/3.2 product-insights'},body:JSON.stringify(body),signal});if(!r.ok)throw new Error(`Spellbook ${path} HTTP ${r.status}`);return r.json()}
export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=86400')
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'})}
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
  const commanders=(Array.isArray(body?.commanders)?body.commanders:[body?.commander]).map(clean).filter(Boolean).slice(0,2)
  const main=parseLines(body?.decklist).filter(x=>!commanders.some(c=>c.toLowerCase()===x.card.toLowerCase()))
  if(!commanders.length||!main.length)return res.status(400).json({error:'Commander(s) and decklist are required.'})
  const request={commanders:commanders.map(card=>({card,quantity:1})),main}
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000)
  try{
    const [combos,bracket]=await Promise.allSettled([post('/find-my-combos',request,ctrl.signal),post('/estimate-bracket',request,ctrl.signal)])
    const comboData=combos.status==='fulfilled'?combos.value:null,bracketData=bracket.status==='fulfilled'?bracket.value:null
    if(!comboData&&!bracketData)throw new Error('Commander Spellbook is temporarily unavailable.')
    return res.status(200).json({
      source:{name:'Commander Spellbook',url:'https://commanderspellbook.com',fetchedAt:new Date().toISOString()},
      included:listFrom(comboData?.included),
      almostIncluded:listFrom(comboData?.almostIncluded||comboData?.almost_included),
      bracketTag:bracketData?.bracketTag||bracketData?.bracket_tag||bracketData?.bracket||null,
      gameChangerCards:(bracketData?.gameChangerCards||bracketData?.game_changer_cards||[]).map(cardName).filter(Boolean),
      bannedCards:(bracketData?.bannedCards||bracketData?.banned_cards||[]).map(cardName).filter(Boolean),
      massLandDenialCards:(bracketData?.massLandDenialCards||bracketData?.mass_land_denial_cards||[]).map(cardName).filter(Boolean),
      extraTurnCards:(bracketData?.extraTurnCards||bracketData?.extra_turn_cards||[]).map(cardName).filter(Boolean),
      twoCardCombos:Number(bracketData?.twoCardCombos?.length||bracketData?.two_card_combos?.length||0),
      warnings:[combos.status==='rejected'?'Combo lookup unavailable':null,bracket.status==='rejected'?'Bracket lookup unavailable':null].filter(Boolean),
    })
  }catch(e){return res.status(e?.name==='AbortError'?504:502).json({error:e?.name==='AbortError'?'Commander Spellbook timed out.':e.message||String(e)})}
  finally{clearTimeout(timer)}
}
