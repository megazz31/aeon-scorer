export const VALID_GROUP_SIZES=new Set([2,4])
export function bracketCapacity(count,groupSize=2){
  const g=VALID_GROUP_SIZES.has(Number(groupSize))?Number(groupSize):2,n=Math.max(0,Math.floor(Number(count)||0))
  if(n<=1)return g
  let size=g
  while(size<n)size*=g
  return size
}
export function roundMatchCounts(count,groupSize=2){
  const g=VALID_GROUP_SIZES.has(Number(groupSize))?Number(groupSize):2,size=bracketCapacity(count,g),out=[]
  let matches=size/g
  out.push(matches)
  while(matches>1){matches=Math.ceil(matches/g);out.push(matches)}
  return out
}
export function initialGroups(entries=[],groupSize=2){
  const g=VALID_GROUP_SIZES.has(Number(groupSize))?Number(groupSize):2,size=bracketCapacity(entries.length,g),padded=[...entries]
  while(padded.length<size)padded.push(null)
  const groups=[]
  for(let i=0;i<padded.length;i+=g)groups.push(padded.slice(i,i+g))
  return groups
}
export function dependentMatchIndex(previousMatchIndex,groupSize=2){return Math.floor(Number(previousMatchIndex||0)/Math.max(2,Number(groupSize)||2))}
