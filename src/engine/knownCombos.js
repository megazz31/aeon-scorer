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
]

export function detectKnownCombos(cards) {
  const names = new Set(cards.map(c=>c.name.toLowerCase()))
  return KNOWN_COMBOS.filter(co => co.cards.every(n => names.has(n.toLowerCase())))
}
