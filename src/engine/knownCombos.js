export const KNOWN_COMBOS = [
  { cards:["Thassa's Oracle","Demonic Consultation"], name:'Thoracle + Consultation', severity:1 },
  { cards:["Thassa's Oracle","Tainted Pact"], name:'Thoracle + Pact', severity:1 },
  { cards:['Isochron Scepter','Dramatic Reversal'], name:'Dramatic Scepter', severity:.85 },
  { cards:['Heliod, Sun-Crowned','Walking Ballista'], name:'Heliod Ballista', severity:.9 },
  { cards:['Exquisite Blood','Sanguine Bond'], name:'Exquisite Bond', severity:.75 },
  { cards:['Exquisite Blood','Vito, Thorn of the Dusk Rose'], name:'Exquisite Vito', severity:.75 },
  { cards:["Painter's Servant",'Grindstone'], name:'Painter Stone', severity:.9 },
  { cards:['Worldgorger Dragon','Animate Dead'], name:'Worldgorger', severity:.9 },
  { cards:['Underworld Breach','Brain Freeze'], name:'Breach Freeze', severity:.9 },
  { cards:['Ob Nixilis, Captive Kingpin','All Will Be One'], name:'Ob Nixilis + All Will Be One', severity:.9, family:'ob-exact-one-loop' },
  { cards:['Redshift, Rocketeer Chief','Sword of the Paruns'], name:'Redshift + Sword of the Paruns', severity:.85, family:'redshift-untap-engine' },
  { cards:['Redshift, Rocketeer Chief','Umbral Mantle'], name:'Redshift + Umbral Mantle', severity:.9, family:'redshift-untap-engine' },
  { cards:['Redshift, Rocketeer Chief','Staff of Domination'], name:'Redshift + Staff of Domination', severity:.9, family:'redshift-untap-engine' },
  { cards:['Redshift, Rocketeer Chief','Aggravated Assault'], name:'Redshift + Aggravated Assault', severity:.9, family:'redshift-untap-engine' },
  { cards:['Kalamax, the Stormsire','Reverberate'], name:'Kalamax + Reverberate', severity:.7, family:'kalamax-copy-loop' },
  { cards:['Kalamax, the Stormsire','Twincast'], name:'Kalamax + Twincast', severity:.7, family:'kalamax-copy-loop' },
  { cards:['Kalamax, the Stormsire','Return the Favor'], name:'Kalamax + Return the Favor', severity:.7, family:'kalamax-copy-loop' },
  { cards:['Kalamax, the Stormsire','Expansion // Explosion'], name:'Kalamax + Expansion', severity:.7, family:'kalamax-copy-loop' },
  { cards:['Kalamax, the Stormsire','Refuse // Cooperate'], name:'Kalamax + Cooperate', severity:.7, family:'kalamax-copy-loop' },
]

export function detectKnownCombos(cards) {
  const names = new Set(cards.map(c=>c.name.toLowerCase()))
  return KNOWN_COMBOS.filter(co => co.cards.every(n => names.has(n.toLowerCase())))
}

export function comboScoringSignal(combos=[]){
  const groups=new Map()
  for(const combo of combos){
    const key=combo.family||combo.name
    const row=groups.get(key)||{severity:0,count:0}
    row.severity=Math.max(row.severity,Number(combo.severity||0));row.count++
    groups.set(key,row)
  }
  let boost=0,redundancy=0
  for(const row of groups.values()){
    boost+=row.severity*14+Math.max(0,row.count-1)*1.5
    redundancy+=Math.max(0,row.count-1)
  }
  return {families:groups.size,redundancy,boost:Math.round(boost*10)/10}
}
