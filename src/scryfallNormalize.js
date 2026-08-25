const uniq=xs=>[...new Set((xs||[]).filter(Boolean))]

export function normalizeScryfallCard(d={}){
  const faces=Array.isArray(d.card_faces)?d.card_faces:[]
  const faceNames=faces.map(f=>f?.name).filter(Boolean)
  const distinctFaceNames=uniq(faceNames)
  const sameNameReversible=distinctFaceNames.length===1&&String(d.name||'').includes(' // ')
  const canonicalFace=sameNameReversible?faces.find(f=>f?.name===distinctFaceNames[0])||faces[0]||{}:null
  const name=sameNameReversible?distinctFaceNames[0]:d.name
  const oracle=d.oracle_text||(sameNameReversible?canonicalFace?.oracle_text||'':faces.map(f=>f?.oracle_text||'').filter(Boolean).join('\n'))
  const manaCost=d.mana_cost||(sameNameReversible?canonicalFace?.mana_cost||'':faces.map(f=>f?.mana_cost||'').filter(Boolean).join(' // '))
  const type=d.type_line||(sameNameReversible?canonicalFace?.type_line||'':uniq(faces.map(f=>f?.type_line)).join(' // '))
  const producedMana=Array.isArray(d.produced_mana)?d.produced_mana:(sameNameReversible?canonicalFace?.produced_mana||[]:uniq(faces.flatMap(f=>f?.produced_mana||[])))
  const colors=Array.isArray(d.colors)?d.colors:(sameNameReversible?canonicalFace?.colors||[]:uniq(faces.flatMap(f=>f?.colors||[])))
  const keywords=Array.isArray(d.keywords)&&d.keywords.length?d.keywords:uniq(faces.flatMap(f=>f?.keywords||[]))
  const extraAliases=uniq([
    d.printed_name,
    d.flavor_name,
    ...faces.flatMap(f=>[f?.printed_name,f?.flavor_name])
  ]).filter(x=>x&&x!==name)
  const aliases=uniq([...faceNames.filter(x=>x&&x!==name),...extraAliases])
  return {
    id:d.id,
    oracleId:d.oracle_id||d.id,
    name,
    aliases,
    manaCost,
    cmc:Number(d.cmc||0),
    type,
    oracle,
    colors,
    colorIdentity:d.color_identity||[],
    keywords,
    producedMana:producedMana||[],
    power:d.power??canonicalFace?.power??faces[0]?.power??null,
    toughness:d.toughness??canonicalFace?.toughness??faces[0]?.toughness??null,
    legalities:d.legalities||{},
    edhrecRank:d.edhrec_rank??null,
    image:d.image_uris?.normal||canonicalFace?.image_uris?.normal||faces[0]?.image_uris?.normal||null,
  }
}
