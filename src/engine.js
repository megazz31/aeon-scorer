// AEON SCORER v6 ENGINE

// GAME CHANGERS LIST (Commander Format Panel Oct 2025)
export const GAME_CHANGERS=["Ad Nauseam","Ancient Tomb","Bazaar of Baghdad","Bolas's Citadel","Cabal Coffers","Carpet of Flowers","Chrome Mox","Consecrated Sphinx","Craterhoof Behemoth","Cyclonic Rift","Dauthi Voidwalker","Deadly Rollick","Deflecting Swat","Demonic Consultation","Demonic Tutor","Dockside Extortionist","Drannith Magistrate","Esper Sentinel","Expropriate","Fierce Guardianship","Flawless Maneuver","Food Chain","Force of Negation","Force of Will","Gaea's Cradle","Grand Abolisher","Imperial Seal","Jeska's Will","Jeweled Lotus","Jin-Gitaxias, Core Augur","Lion's Eye Diamond","Mana Crypt","Mana Drain","Mana Vault","Mox Diamond","Mystic Remora","Mystical Tutor","Natural Order","Necropotence","Notion Thief","Orcish Bowmasters","Opposition Agent","Painter's Servant","Ragavan, Nimble Pilferer","Rhystic Study","Sensei's Divining Top","Serra Ascendant","Sheoldred, the Apocalypse","Smothering Tithe","Sol Ring","Survival of the Fittest","Sylvan Library","Tainted Pact","Teferi's Protection","Thassa's Oracle","The One Ring","Toxic Deluge","Underworld Breach","Vampiric Tutor","Veil of Summer","Yuriko, the Tiger's Shadow","Tergrid, God of Fright"].map(n=>n.toLowerCase());

// PRIMITIVES
const P=[
{p:/draw (\w+) cards?/gi,cat:"Draw",sc:m=>pw(m[1])*4,l:m=>`Draw ${m[1]}`},
{p:/\bdraw a card\b/gi,cat:"Draw",sc:()=>4,l:()=>"Draw 1"},
{p:/draw two additional/gi,cat:"Draw",sc:()=>8,l:()=>"Draw +2"},
{p:/you may draw two cards/gi,cat:"Draw",sc:()=>6,l:()=>"May draw 2"},
{p:/look at the top.*put.*into your hand/gi,cat:"Draw",sc:()=>3,l:()=>"Filter→hand"},
{p:/reveal the top.*put.*into your hand/gi,cat:"Draw",sc:()=>3,l:()=>"Reveal→hand"},
{p:/search your library for a card,/gi,cat:"Tutor",sc:()=>7,l:()=>"Tutor (any)"},
{p:/search your library for an? \w+ card/gi,cat:"Tutor",sc:()=>5,l:()=>"Tutor (typed)"},
{p:/search your library for.*(basic land|land card)/gi,cat:"Ramp",sc:()=>3,l:()=>"Land tutor"},
{p:/scry (\d+)/gi,cat:"Filter",sc:m=>parseInt(m[1])*.8,l:m=>`Scry ${m[1]}`},
{p:/surveil (\d+)/gi,cat:"Filter",sc:m=>parseInt(m[1])*1.2,l:m=>`Surveil ${m[1]}`},
{p:/destroy all creatures/gi,cat:"Wipe",sc:()=>8,l:()=>"Board wipe"},
{p:/exile all/gi,cat:"Wipe",sc:()=>10,l:()=>"Mass exile"},
{p:/all creatures get -(\d+)\/-(\d+)/gi,cat:"Wipe",sc:m=>(parseInt(m[1])+parseInt(m[2]))*1.2,l:m=>`-${m[1]}/-${m[2]} all`},
{p:/destroy target (creature|permanent|planeswalker|artifact|enchantment)/gi,cat:"Removal",sc:()=>4,l:m=>`Kill ${m[1]}`},
{p:/exile target (creature|permanent|planeswalker)/gi,cat:"Removal",sc:()=>5,l:m=>`Exile ${m[1]}`},
{p:/return target.*to its owner's hand/gi,cat:"Removal",sc:()=>3,l:()=>"Bounce"},
{p:/counter target spell/gi,cat:"Counter",sc:()=>5,l:()=>"Counter"},
{p:/counter target noncreature/gi,cat:"Counter",sc:()=>4,l:()=>"Counter (nc)"},
{p:/create a Treasure token/gi,cat:"Ramp",sc:()=>2,l:()=>"Treasure"},
{p:/create (\w+) Treasure/gi,cat:"Ramp",sc:m=>pw(m[1])*2,l:m=>`${m[1]} Treasures`},
{p:/\badd \{.\}\{.\}\{.\}/gi,cat:"Ramp",sc:()=>6,l:()=>"Add 3 mana"},
{p:/\badd \{.\}\{.\}/gi,cat:"Ramp",sc:()=>4,l:()=>"Add 2 mana"},
{p:/\badd \{.\}/gi,cat:"Ramp",sc:()=>2,l:()=>"Add 1 mana"},
{p:/add one mana of any color/gi,cat:"Ramp",sc:()=>2.5,l:()=>"Any color"},
{p:/add three mana of any/gi,cat:"Ramp",sc:()=>7,l:()=>"Add 3 any"},
{p:/create (\w+) .*creature tokens?/gi,cat:"Tokens",sc:m=>pw(m[1])*2.5,l:m=>`${m[1]} token(s)`},
{p:/create a token that's a copy/gi,cat:"Tokens",sc:()=>6,l:()=>"Clone token"},
{p:/each opponent loses (\d+) life/gi,cat:"Drain",sc:m=>parseInt(m[1])*1.5,l:m=>`Opp -${m[1]}`},
{p:/target player loses (\d+) life and you gain/gi,cat:"Drain",sc:m=>parseInt(m[1])*2,l:m=>`Drain ${m[1]}`},
{p:/whenever you gain life.*loses that much/gi,cat:"Drain",sc:()=>6,l:()=>"Life→drain"},
{p:/whenever an opponent loses life.*you gain/gi,cat:"Drain",sc:()=>5,l:()=>"Loss→gain"},
{p:/you gain (\d+) life/gi,cat:"Life",sc:m=>parseInt(m[1])*.5,l:m=>`+${m[1]} life`},
{p:/deals? (\d+) damage to any target/gi,cat:"Damage",sc:m=>parseInt(m[1])*1.5,l:m=>`${m[1]} dmg`},
{p:/\bindestructible\b/gi,cat:"Protect",sc:()=>3,l:()=>"Indestructible"},
{p:/\bhexproof\b/gi,cat:"Protect",sc:()=>3,l:()=>"Hexproof"},
{p:/protection from everything/gi,cat:"Protect",sc:()=>8,l:()=>"Prot everything"},
{p:/protection from/gi,cat:"Protect",sc:()=>2,l:()=>"Protection"},
{p:/\bflying\b/gi,cat:"Evasion",sc:()=>1.5,l:()=>"Flying"},
{p:/\bmenace\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Menace"},
{p:/\btrample\b/gi,cat:"Evasion",sc:()=>1,l:()=>"Trample"},
{p:/can't be blocked/gi,cat:"Evasion",sc:()=>3,l:()=>"Unblockable"},
{p:/\bfirst strike\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"1st Strike"},
{p:/\bdouble strike\b/gi,cat:"Combat",sc:()=>4,l:()=>"Dbl Strike"},
{p:/\bdeathtouch\b/gi,cat:"Combat",sc:()=>2,l:()=>"Deathtouch"},
{p:/\blifelink\b/gi,cat:"Combat",sc:()=>2,l:()=>"Lifelink"},
{p:/\bvigilance\b/gi,cat:"Combat",sc:()=>1,l:()=>"Vigilance"},
{p:/\bhaste\b/gi,cat:"Combat",sc:()=>1.5,l:()=>"Haste"},
{p:/\bflash\b/gi,cat:"Combat",sc:()=>2,l:()=>"Flash"},
{p:/without paying (its|their) mana cost/gi,cat:"Free",sc:()=>8,l:()=>"Free cast"},
{p:/you may cast this spell without paying/gi,cat:"Free",sc:()=>6,l:()=>"Free (cond)"},
{p:/\bdelve\b/gi,cat:"Reduce",sc:()=>4,l:()=>"Delve"},
{p:/\btake an extra turn\b/gi,cat:"Extra",sc:()=>20,l:()=>"EXTRA TURN"},
{p:/additional combat phase/gi,cat:"Extra",sc:()=>6,l:()=>"Extra combat"},
{p:/you win the game/gi,cat:"Win",sc:()=>15,l:()=>"WIN GAME"},
{p:/\bstorm\b/gi,cat:"Storm",sc:()=>6,l:()=>"Storm"},
{p:/\bcascade\b/gi,cat:"Cascade",sc:()=>5,l:()=>"Cascade"},
{p:/other .* you control get \+(\d+)\/\+(\d+)/gi,cat:"Lord",sc:m=>(parseInt(m[1])+parseInt(m[2]))*2,l:m=>`Lord +${m[1]}/+${m[2]}`},
{p:/creatures you control get \+/gi,cat:"Anthem",sc:()=>4,l:()=>"Anthem"},
{p:/put a \+1\/\+1 counter on each/gi,cat:"+1/+1",sc:()=>4,l:()=>"+1/+1 all"},
{p:/put (\w+) \+1\/\+1 counter/gi,cat:"+1/+1",sc:m=>pw(m[1])*1.5,l:m=>`+1/+1 x${m[1]}`},
{p:/proliferate/gi,cat:"+1/+1",sc:()=>3,l:()=>"Proliferate"},
{p:/return.*from.*graveyard.*to the battlefield/gi,cat:"Recursion",sc:()=>5,l:()=>"Reanimate"},
{p:/return.*from your graveyard to your hand/gi,cat:"Recursion",sc:()=>3,l:()=>"GY→hand"},
{p:/whenever.*dies/gi,cat:"Death",sc:()=>2,l:()=>"Death trigger"},
{p:/whenever you sacrifice/gi,cat:"Sacrifice",sc:()=>2,l:()=>"Sac trigger"},
{p:/sacrifice a creature/gi,cat:"Sacrifice",sc:()=>1,l:()=>"Sac outlet"},
{p:/whenever an opponent (draws|casts|plays)/gi,cat:"Tax",sc:()=>3,l:m=>`Tax ${m[1]}`},
{p:/opponents can't/gi,cat:"Stax",sc:()=>5,l:()=>"Opp can't"},
{p:/each player.*sacrifices/gi,cat:"Stax",sc:()=>4,l:()=>"Sym sac"},
{p:/target player discards/gi,cat:"Discard",sc:()=>3,l:()=>"Discard"},
{p:/each opponent discards/gi,cat:"Discard",sc:()=>4,l:()=>"Mass discard"},
{p:/cumulative upkeep/gi,cat:"Downside",sc:()=>-2,l:()=>"Cum. upkeep"},
];

function pw(w){const m={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,x:3};return parseInt(w)||m[w?.toLowerCase()]||1;}

// RECURRENCE
function recMult(o){
  if(/at the beginning of/i.test(o))return 2.5;
  if(/whenever/i.test(o))return 2.0;
  if(/\{.*\}.*:/i.test(o)&&!/sacrifice.*:/i.test(o))return 1.5;
  return 1.0;
}
function cmcMult(c){return c<=0?2.5:c<=1?2:c<=2?1.5:c<=3?1.2:c<=4?1:c<=5?.9:c<=6?.8:.7;}

export function scoreCard(oracle,cmc){
  const dets=[];let raw=0;
  for(const pr of P){pr.p.lastIndex=0;let m;while((m=pr.p.exec(oracle))!==null){const s=pr.sc(m);dets.push({cat:pr.cat,label:pr.l(m),score:Math.round(s*10)/10});raw+=s;if(!pr.p.global)break;}pr.p.lastIndex=0;}
  const rm=recMult(oracle),cm=cmcMult(cmc),adj=raw*rm*cm;
  return{dets,raw:Math.round(raw*10)/10,rm,cm,pts:Math.max(0,Math.round(adj/3))};
}

// COMBOS
export const COMBOS=[
{cards:["Thassa's Oracle","Demonic Consultation"],name:"Thoracle",mult:3,tier:"S"},
{cards:["Thassa's Oracle","Tainted Pact"],name:"Thoracle Pact",mult:3,tier:"S"},
{cards:["Isochron Scepter","Dramatic Reversal"],name:"Dramatic Scepter",mult:2.5,tier:"S"},
{cards:["Splinter Twin","Deceiver Exarch"],name:"Splinter Twin",mult:3,tier:"S"},
{cards:["Exquisite Blood","Sanguine Bond"],name:"Exquisite Bond",mult:2.5,tier:"A"},
{cards:["Exquisite Blood","Vito, Thorn of the Dusk Rose"],name:"Exquisite Vito",mult:2.5,tier:"A"},
{cards:["Food Chain","Eternal Scourge"],name:"Food Chain",mult:2.8,tier:"S"},
{cards:["Underworld Breach","Brain Freeze"],name:"Breach Freeze",mult:2.8,tier:"S"},
{cards:["Underworld Breach","Lion's Eye Diamond"],name:"Breach LED",mult:2.8,tier:"S"},
{cards:["Painter's Servant","Grindstone"],name:"Painter Stone",mult:3,tier:"S"},
{cards:["Heliod, Sun-Crowned","Walking Ballista"],name:"Heliod Ballista",mult:3,tier:"S"},
{cards:["Phyrexian Obliterator","Pariah"],name:"Obliterator Lock",mult:2,tier:"A"},
{cards:["Blood Artist","Cordial Vampire"],name:"Aristocrats",mult:1.3,tier:"B"},
{cards:["Elenda, the Dusk Rose","Blood Artist"],name:"Elenda Drain",mult:1.4,tier:"B"},
{cards:["Dusk Legion Duelist","Cordial Vampire"],name:"Counter Draw",mult:1.3,tier:"B"},
{cards:["Sheoldred, the Apocalypse","The One Ring"],name:"Sheoldred Ring",mult:1.6,tier:"A"},
{cards:["Urborg, Tomb of Yawgmoth","Cabal Coffers"],name:"Urborg Coffers",mult:1.8,tier:"A"},
{cards:["Sorin, Imperious Bloodlord","Bloodline Keeper"],name:"Sorin→Keeper",mult:1.5,tier:"B"},
{cards:["Sorin, Imperious Bloodlord","Elenda, the Dusk Rose"],name:"Sorin→Elenda",mult:1.5,tier:"B"},
{cards:["Necropotence","Ad Nauseam"],name:"Double Draw",mult:1.8,tier:"A"},
{cards:["Worldgorger Dragon","Animate Dead"],name:"Worldgorger",mult:2.8,tier:"S"},
{cards:["Karmic Guide","Reveillark"],name:"Karmic Lark",mult:2,tier:"A"},
];

export function detectCombos(names){const l=names.map(n=>n.toLowerCase());return COMBOS.filter(co=>co.cards.every(cn=>l.some(dn=>dn===cn.toLowerCase())));}

// TAGS
const TP={sacrifice:[/sacrifice/gi,/whenever.*dies/gi],tokens:[/create.*token/gi],counters:[/\+1\/\+1/gi,/proliferate/gi],lifegain:[/gain.*life|lifelink/gi],graveyard:[/graveyard|return.*from/gi],spells:[/whenever.*cast.*(instant|sorcery)|copy.*spell/gi],tribal:[/vampire|elf|goblin|merfolk|zombie|angel|demon|dragon|knight|wizard/gi],aggro:[/haste|double strike/gi],control:[/counter target|destroy all/gi]};
export function getTags(o){const t=[];for(const[k,ps]of Object.entries(TP)){for(const p of ps){p.lastIndex=0;if(p.test(o)){t.push(k);break;}p.lastIndex=0;}}return[...new Set(t)];}

export function detectArchetype(deck){
  const t=deck.length||1;const cr=deck.filter(c=>/creature/i.test(c.type||"")).length;
  const nl=deck.filter(c=>!/land/i.test(c.type||""));
  const avg=nl.length>0?nl.reduce((s,c)=>s+(c.cmc||0),0)/nl.length:3;
  const rem=deck.filter(c=>/destroy target|exile target|counter target/i.test(c.oracle||"")).length;
  const tut=deck.filter(c=>/search your library/i.test(c.oracle||"")).length;
  const combos=detectCombos(deck.map(c=>c.name));
  if(combos.some(c=>c.tier==="S")&&tut>=3)return"combo";
  if(cr/t>.45&&avg<2.8)return"aggro";
  if(rem/t>.15||cr/t<.25)return"control";
  return"midrange";
}

function ctxBonus(card,arch){
  const o=(card.oracle||"").toLowerCase(),t=(card.type||"").toLowerCase();
  if(arch==="aggro"&&t.includes("creature")&&(card.cmc||0)<=3)return 1.2;
  if(arch==="control"&&/counter|destroy|exile/i.test(o))return 1.2;
  if(arch==="combo"&&/search your library|draw/i.test(o))return 1.3;
  return 1.0;
}

// FULL SCORING
export function scoreFullDeck(deck,cmdOracle){
  const ct=getTags(cmdOracle||""),names=deck.map(c=>c.name),combos=detectCombos(names),arch=detectArchetype(deck);
  const tut=deck.filter(c=>/search your library/i.test(c.oracle||"")).length;
  const fm=deck.filter(c=>(c.cmc||0)<=1&&/add \{|mana of any|treasure/i.test(c.oracle||"")).length;
  const nl=deck.filter(c=>!/land/i.test(c.type||""));
  const avg=nl.length>0?nl.reduce((s,c)=>s+(c.cmc||0),0)/nl.length:3;
  const spd=avg<=2?1.3:avg<=2.5?1.15:avg<=3?1:avg<=3.5?.9:.8;

  const scored=deck.map(card=>{
    const sc=scoreCard(card.oracle||"",card.cmc||0);
    const tags=getTags(card.oracle||""),ov=ct.filter(t=>tags.includes(t));
    const cmdM=1+ov.length*.15;
    const myC=combos.filter(co=>co.cards.some(cn=>cn.toLowerCase()===card.name.toLowerCase()));
    const coM=myC.length>0?Math.max(...myC.map(c=>c.mult)):1;
    const ctx=ctxBonus(card,arch);
    const gc=GAME_CHANGERS.includes(card.name.toLowerCase());
    const final=Math.max(0,Math.round(sc.pts*cmdM*coM*ctx));
    return{...card,sc,tags,ov,cmdM:Math.round(cmdM*100)/100,myC,coM,ctx,final,gc};
  });

  const rawP=scored.reduce((s,c)=>s+c.final,0);
  const intB=deck.filter(c=>/destroy target|exile target|counter target/i.test(c.oracle||"")).length*5;
  const drwB=deck.filter(c=>/draw a card|draw \w+ card/i.test(c.oracle||"")).length*3;
  const coB=combos.reduce((s,co)=>s+(co.tier==="S"?50:co.tier==="A"?25:10),0);
  const pr=Math.round(rawP*spd+intB+drwB+coB);

  return{scored,pr,arch,spd,tut,fm,avg:Math.round(avg*100)/100,combos,coB,intB,drwB};
}

// BRACKETS
export function getBracket(pr,size){
  if(size>=80){
    if(pr<=150)return{n:1,name:"Exhibition",c:"#22c55e",d:"Thématique, fun"};
    if(pr<=300)return{n:2,name:"Core",c:"#3b82f6",d:"Niveau precon"};
    if(pr<=500)return{n:3,name:"Upgraded",c:"#f59e0b",d:"Precon amélioré"};
    if(pr<=700)return{n:4,name:"Optimized",c:"#ef4444",d:"Haute puissance"};
    return{n:5,name:"cEDH",c:"#dc2626",d:"Compétitif max"};
  }else{
    if(pr<=100)return{n:1,name:"Casual",c:"#22c55e",d:"Kitchen table"};
    if(pr<=220)return{n:2,name:"FNM",c:"#3b82f6",d:"Compétitif local"};
    if(pr<=380)return{n:3,name:"Competitive",c:"#f59e0b",d:"Tournois régionaux"};
    if(pr<=550)return{n:4,name:"Pro",c:"#ef4444",d:"Grand Prix level"};
    return{n:5,name:"Elite",c:"#dc2626",d:"Pro Tour / Worlds"};
  }
}

// ANALYTICS
export function analyzeDeck(deck,scored){
  const nl=deck.filter(c=>!/land/i.test(c.type||"")),t=deck.length||1;
  const cr=deck.filter(c=>/creature/i.test(c.type||"")).length;
  const is=deck.filter(c=>/instant|sorcery/i.test(c.type||"")).length;
  const la=deck.filter(c=>/land/i.test(c.type||"")).length;
  const curve={};nl.forEach(c=>{const k=Math.min(c.cmc||0,7);curve[k]=(curve[k]||0)+1;});
  const avg=nl.length>0?nl.reduce((s,c)=>s+(c.cmc||0),0)/nl.length:0;
  const ds=deck.filter(c=>/draw a card|draw \w+ card|scry|you may draw/i.test(c.oracle||"")).length;
  const rm=deck.filter(c=>/destroy target|exile target|counter target/i.test(c.oracle||"")).length;
  const rp=deck.filter(c=>/add \{|mana of any|treasure|search your library for.*land/i.test(c.oracle||"")&&!/land/i.test(c.type||"")).length;
  const rc=deck.filter(c=>/graveyard.*battlefield|return.*from/i.test(c.oracle||"")).length;
  const tu=deck.filter(c=>/search your library/i.test(c.oracle||"")).length;
  const gc=(scored||[]).filter(c=>c.gc).length;
  const lr=t>=80?.37:.40;
  const m={
    curve:Math.max(0,Math.min(100,Math.round(100-Math.abs(avg-2.8)*25))),
    ca:Math.min(100,Math.round(ds/t/(t>=80?.10:.08)*100)),
    interaction:Math.min(100,Math.round(rm/t/(t>=80?.10:.08)*100)),
    mana:Math.min(100,Math.round(la/t/lr*100)),
    ramp:Math.min(100,Math.round(rp*8)),
    resilience:Math.min(100,Math.round(ds*6+rc*10+10)),
  };
  m.global=Math.round(Object.values(m).reduce((s,v)=>s+v,0)/6);
  return{t,cr,is,la,curve,avg:Math.round(avg*100)/100,ds,rm,rp,rc,tu,gc,m};
}

// SIMULATION
export function simHands(deck,n=2000){
  const cards=[];deck.forEach(c=>{for(let i=0;i<(c.qty||1);i++)cards.push(c);});
  if(cards.length<7)return null;
  let lok=0,t1=0,play=0,tl=0,mull=0;
  for(let i=0;i<n;i++){
    const s=[...cards];for(let j=s.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[s[j],s[k]]=[s[k],s[j]];}
    let h=s.slice(0,7),li=h.filter(c=>/land/i.test(c.type||"")).length;
    if(li<=1||li>=6){mull++;for(let j=s.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[s[j],s[k]]=[s[k],s[j]];}h=s.slice(0,7);li=h.filter(c=>/land/i.test(c.type||"")).length;}
    tl+=li;if(li>=2&&li<=5)lok++;
    if(li>=2&&li<=5&&h.some(c=>!/land/i.test(c.type||"")&&(c.cmc||0)<=3))play++;
    if(h.some(c=>!/land/i.test(c.type||"")&&(c.cmc||0)<=1))t1++;
  }
  return{n,play:Math.round(play/n*100),lok:Math.round(lok/n*100),t1:Math.round(t1/n*100),avgL:Math.round(tl/n*10)/10,mull:Math.round(mull/n*100)};
}

export const CC={"Draw":"#3b82f6","Tutor":"#8b5cf6","Ramp":"#22c55e","Filter":"#06b6d4","Wipe":"#dc2626","Removal":"#ef4444","Counter":"#6366f1","Tokens":"#f59e0b","Drain":"#a855f7","Life":"#ec4899","Damage":"#f97316","Protect":"#06b6d4","Evasion":"#8b5cf6","Combat":"#d97706","+1/+1":"#84cc16","Lord":"#eab308","Anthem":"#eab308","Recursion":"#6366f1","Free":"#7c3aed","Reduce":"#059669","Extra":"#dc2626","Win":"#dc2626","Storm":"#b91c1c","Cascade":"#7c3aed","Death":"#9333ea","Sacrifice":"#a21caf","Tax":"#f59e0b","Stax":"#991b1b","Discard":"#78350f","Downside":"#6b7280"};
export const TC={S:"#dc2626",A:"#f59e0b",B:"#3b82f6"};
