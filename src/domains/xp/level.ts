export const LEVEL_EXPONENT=1.65;export const LEVEL_BASE=100;
export function totalXpForLevel(level:number){if(!Number.isInteger(level)||level<1)throw new RangeError("Level must be a positive integer");return Math.floor(LEVEL_BASE*Math.pow(level-1,LEVEL_EXPONENT))}
export function levelFromXp(xp:number){if(!Number.isFinite(xp)||xp<0)throw new RangeError("XP cannot be negative");let low=1,high=2;while(totalXpForLevel(high)<=xp)high*=2;while(low+1<high){const mid=Math.floor((low+high)/2);if(totalXpForLevel(mid)<=xp)low=mid;else high=mid}return low}
export function levelProgress(xp:number){const level=levelFromXp(xp),start=totalXpForLevel(level),next=totalXpForLevel(level+1);return{level,totalXp:xp,currentLevelXp:xp-start,nextLevelXp:next-start,remainingXp:next-xp,percentage:(xp-start)/(next-start)*100}}
export type Effort="tiny"|"small"|"moderate"|"significant"|"major";
const rewards:Record<Effort,number>={tiny:5,small:10,moderate:25,significant:50,major:100};
export function proposedXp(effort:Effort,durationMinutes?:number,repetitionsLast30Days=0){const base=rewards[effort];const durationFactor=durationMinutes?Math.min(1.5,Math.max(.75,durationMinutes/45)):1;const noveltyFactor=Math.max(.6,1-Math.max(0,repetitionsLast30Days-3)*.05);return Math.max(1,Math.round(base*durationFactor*noveltyFactor/5)*5)}
