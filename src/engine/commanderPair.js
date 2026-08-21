const text=c=>String(c?.oracle||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
const type=c=>String(c?.type||c?.type_line||'').toLowerCase()
const frontName=c=>String(c?.name||'').split(' // ')[0].trim()
const norm=s=>String(s||'').trim().toLowerCase().replace(/[’]/g,"'")
const uniq=xs=>[...new Set(xs)]

export function combinedColorIdentity(commanders=[]){return uniq(commanders.flatMap(c=>c?.colorIdentity||c?.color_identity||[])).sort()}
export function isBackground(c){return /\blegendary\b/.test(type(c))&&/\benchantment\b/.test(type(c))&&/\bbackground\b/.test(type(c))}
export function choosesBackground(c){return /\bchoose a background\b/.test(text(c))}
export function hasFriendsForever(c){return /\bfriends forever\b/.test(text(c))}
export function hasDoctorsCompanion(c){return /\bdoctor'?s companion\b/.test(text(c))}
export function isDoctor(c){const t=type(c);if(!/\blegendary\b/.test(t)||!/\bcreature\b/.test(t))return false;const sub=(t.split('—')[1]||t.split('-')[1]||'').trim().split(/\s+/).filter(Boolean);return sub.length===2&&sub.includes('time')&&sub.includes('lord')&&/\bdoctor\b/.test(t)}
export function hasOpenPartner(c){const o=text(c);return /(?:^|[.;])\s*partner\s*(?:$|[.;])/.test(o)||/\bpartner\s*\([^)]*you can have two commanders/.test(String(c?.oracle||'').toLowerCase())}
export function partnerWithTarget(c){const m=String(c?.oracle||'').match(/\bpartner with ([^(\n.]+)/i);return m?.[1]?.trim()||null}

export function commanderPairKind(a,b){
  if(!a||!b)return null
  if(hasOpenPartner(a)&&hasOpenPartner(b))return 'partner'
  if(hasFriendsForever(a)&&hasFriendsForever(b))return 'friends-forever'
  if((choosesBackground(a)&&isBackground(b))||(choosesBackground(b)&&isBackground(a)))return 'background'
  if((hasDoctorsCompanion(a)&&isDoctor(b))||(hasDoctorsCompanion(b)&&isDoctor(a)))return 'doctors-companion'
  const at=partnerWithTarget(a),bt=partnerWithTarget(b),an=norm(frontName(a)),bn=norm(frontName(b))
  if((at&&norm(at)===bn)||(bt&&norm(bt)===an))return 'partner-with'
  return null
}
export function validateCommanderPair(a,b){const kind=commanderPairKind(a,b);return kind?{ok:true,kind,colorIdentity:combinedColorIdentity([a,b])}:{ok:false,kind:null,colorIdentity:combinedColorIdentity([a,b]),reason:'These cards do not expose a supported two-commander pairing ability.'}}
export function commanderPriorityProfile(commanders=[]){const colored=commanders.flatMap(c=>c?.manaReq?.colored||[]),colors=combinedColorIdentity(commanders);return {name:commanders.map(frontName).join(' + '),manaReq:{generic:0,colored,colors},colorIdentity:colors}}
