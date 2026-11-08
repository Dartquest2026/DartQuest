// Count only visits evidenced by the existing raw training data.
export function standardVisitCount(game,state) {
 if(game==='201')return Array.isArray(state.visits)?state.visits.length:null
 if(game==='bull-finisher')return Number.isInteger(state.totalVisits)?state.totalVisits:null
 if(game!=='random-checkouts'||!Array.isArray(state.attempts))return null
 let total=0
 for(const attempt of state.attempts){
  const darts=attempt.success?attempt.dartsUsed:attempt.allowedDarts
  if(!Number.isInteger(darts)||darts<1)return null
  total+=Math.ceil(darts/3)
 }
 return total+Math.max(0,(state.currentVisit??1)-1)
}
