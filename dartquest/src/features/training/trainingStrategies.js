import { CHECKOUT_FINISH_VALUES, DARTBOARD_HIT_VALUES, getMinimumCheckoutDarts } from '../campaignModes/rivalEngine.js'

const range = (a,b) => Array.from({length:b-a+1},(_,i)=>a+i)
const bounded = (v,min,max,fallback) => Math.min(max,Math.max(min,Math.round(Number(v)||fallback)))
export function checkoutOptions(score, config) {
  let minimum = config.outMode === 'double' ? getMinimumCheckoutDarts(score) : null
  if (minimum == null) {
    const finishes = config.outMode === 'straight' ? DARTBOARD_HIT_VALUES.filter(v=>v>0) : config.outMode === 'master' ? [...CHECKOUT_FINISH_VALUES,...range(1,20).map(v=>v*3)] : CHECKOUT_FINISH_VALUES
    let reachable = new Set([0])
    for(let darts=1;darts<=config.maxDarts;darts++) {
      if(finishes.some(v=>reachable.has(score-v))) { minimum=darts; break }
      reachable=new Set([...reachable].flatMap(v=>DARTBOARD_HIT_VALUES.map(hit=>v+hit)).filter(v=>v<score))
    }
  }
  return minimum == null ? [] : range(minimum,config.maxDarts)
}
export function normalizeStrategyConfig(template,c) {
  if(trainingStrategies[template.type]?.checkout) {
    c.outMode=['straight','double','master'].includes(c.outMode)?c.outMode:'double'
    c.start=bounded(c.start,2,170,template.defaults.start)
    c.end=bounded(c.end,c.start,170,template.defaults.end)
    c.maxDarts=bounded(c.maxDarts,3,15,template.defaults.maxDarts)
    if(template.type==='randomCheckout') { c.count=bounded(c.count,1,100,10); c.repeatUntilSuccess=c.repeatUntilSuccess!==false }
    if(template.type==='nineDarts') c.failureMode=c.failureMode==='previous'?'previous':'base'
  }
  if(template.type==='bobs27') {
    c.startScore=bounded(c.startScore,1,1000,27); c.startDouble=bounded(c.startDouble,1,20,1); c.endDouble=bounded(c.endDouble,c.startDouble,20,20); c.dartsPerDouble=bounded(c.dartsPerDouble,1,6,3)
  }
  if(template.type==='sequence' && c.hitsPerTarget != null) {
    c.order=['ascending','descending','board','random'].includes(c.order)?c.order:(template.id==='around-board-order'?'board':'ascending')
    c.ring=['single','segment','double','triple'].includes(c.ring)?c.ring:'segment'
    c.includeBull=Boolean(c.includeBull)
    c.targets=c.order==='board'?[1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5,20]:range(1,20)
    if(c.order==='descending') c.targets.reverse()
    if(c.includeBull) c.targets.push(25)
  }
  return c
}
function randomTarget(c,previous,random=Math.random) {
  const pool=range(c.start,c.end).filter(v=>checkoutOptions(v,c).length)
  const candidates=pool.filter(v=>v!==previous)
  const choices=candidates.length?candidates:pool
  return choices[Math.floor(random()*choices.length)] ?? c.start
}
const checkoutInitial = c => ({currentTarget:c.start,currentBase:c.start,highestReached:c.start,successfulCheckouts:0,attempts:0,checkoutDarts:[],dartsUsed:0,totalPoints:0})
function checkoutRecord(kind,c,s,e) {
  if(e.result!=='miss' && (e.result!=='checkout'||!checkoutOptions(s.currentTarget,c).includes(e.darts))) return null
  const success=e.result==='checkout', used=success?e.darts:c.maxDarts
  let points=success?1:0, target=s.currentTarget, base=s.currentBase
  const successes=s.successfulCheckouts+Number(success)
  if(kind==='catch40') { points=success?(e.darts<=2 || target===99&&e.darts===3?3:e.darts===3?2:1):0; target++ }
  if(kind==='checkoutRange'&&success) target++
  if(kind==='randomCheckout'&&(success||!c.repeatUntilSuccess)) target=randomTarget(c,target)
  if(kind==='nineDarts') {
    if(success) { target++; base=Math.max(base,c.start+Math.floor((target-c.start)/5)*5); if(e.darts<=3) base=target }
    else target=c.failureMode==='previous'?Math.max(base,target-1):base
  }
  return {...s,currentTarget:target,currentBase:base,highestReached:Math.max(s.highestReached,target),successfulCheckouts:successes,attempts:s.attempts+1,checkoutDarts:success?[...s.checkoutDarts,e.darts]:s.checkoutDarts,dartsUsed:s.dartsUsed+used,totalPoints:s.totalPoints+points,score:kind==='nineDarts'?Math.max(s.highestReached,target)-c.start:s.score+points,complete:kind==='randomCheckout'?successes>=c.count:target>c.end,points,visitComplete:true}
}
const checkoutStrategy = kind => ({
  checkout:true, initial:c=>({...checkoutInitial(c),...(kind==='randomCheckout'?{currentTarget:randomTarget(c)}:{})}),
  target:(c,s)=>String(s.currentTarget), record:(c,s,e)=>checkoutRecord(kind,c,s,e),
  maximum:c=>(kind==='randomCheckout'?c.count:c.end-c.start+1)*(kind==='catch40'?3:1),
  description:c=>`${c.start}–${c.end} · max. ${c.maxDarts} Darts · ${c.outMode.toUpperCase()} OUT`,
})
export function jdcStage(s) {
  const i=s.events.length
  if(i<18) return {part:0,target:10+Math.floor(i/3),darts:3}
  if(i<39) return {part:1,target:i===38?25:i-17,darts:1}
  return {part:2,target:15+Math.floor((i-39)/3),darts:3}
}
export const trainingStrategies = {
  checkoutRange:checkoutStrategy('checkoutRange'), catch40:checkoutStrategy('catch40'), randomCheckout:checkoutStrategy('randomCheckout'), nineDarts:checkoutStrategy('nineDarts'),
  bobs27:{
    initial:c=>({score:c.startScore,currentDouble:c.startDouble,doubleHits:0,missedDoubles:[],dartsUsed:0}),
    target:(c,s)=>`D${s.currentDouble}`, maximum:c=>c.startScore+range(c.startDouble,c.endDouble).reduce((sum,v)=>sum+2*v*c.dartsPerDouble,0),
    description:c=>`${c.startScore} Startpunkte · D${c.startDouble}–D${c.endDouble} · ${c.dartsPerDouble} Darts`,
    record:(c,s,e)=>{
      const hit=e.result==='double', end=(s.events.length+1)%c.dartsPerDouble===0
      const previous=s.events.slice(s.events.length-s.events.length%c.dartsPerDouble)
      const missed=end&&!hit&&!previous.some(v=>v.result==='double')
      const points=hit?2*s.currentDouble:missed?-2*s.currentDouble:0
      const score=s.score+points
      return {...s,score,points,currentDouble:s.currentDouble+Number(end),doubleHits:s.doubleHits+Number(hit),missedDoubles:missed?[...s.missedDoubles,s.currentDouble]:s.missedDoubles,dartsUsed:s.dartsUsed+1,complete:end&&(s.currentDouble===c.endDouble||score<=0),visitComplete:end}
    },
  },
  jdc:{
    initial:()=>({partScores:[0,0,0],shanghaiBonuses:0,doubleHits:0,dartsUsed:0}), target:(c,s)=>{const stage=jdcStage(s);return stage.part===1?(stage.target===25?'BULL':`D${stage.target}`):String(stage.target)},
    maximum:()=>3330, eventCount:()=>57, description:()=> 'Shanghai 10–15 · D1–D20 + Bull · Shanghai 15–20',
    record:(c,s,e)=>{
      const stage=jdcStage(s), hit=stage.part===1&&(stage.target===25?e.result==='bullseye':e.result==='double')
      const multiplier={single:1,double:2,triple:3}[e.result]??0
      let points=stage.part===1?(hit?50:0):stage.target*multiplier
      const end=stage.part===1||(s.events.length+(stage.part===2?-39:0)+1)%3===0
      const bonus=stage.part!==1&&end&&new Set([...s.events.slice(-2).map(v=>v.result),e.result].filter(v=>['single','double','triple'].includes(v))).size===3
      if(bonus) points+=100
      const partScores=s.partScores.map((v,i)=>v+(i===stage.part?points:0))
      return {...s,points,score:s.score+points,partScores,shanghaiBonuses:s.shanghaiBonuses+Number(bonus),doubleHits:s.doubleHits+Number(hit),dartsUsed:s.dartsUsed+1,complete:s.events.length+1===57,visitComplete:end}
    },
  },
}
export function trainingVisitSize(task,state) {
  if(trainingStrategies[task.type]?.checkout||['highscore','checkout'].includes(task.type)) return 1
  if(task.type==='bobs27') return task.configuration.dartsPerDouble
  if(task.type==='jdc') return jdcStage(state).darts
  return task.configuration.dartsPerRound||3
}

export function trainingConfigError(task) {
  const c=task.configuration
  if (!trainingStrategies[task.type]?.checkout) return null
  const possible=range(c.start,c.end).filter(v=>checkoutOptions(v,c).length)
  if(task.type==='randomCheckout' && !possible.length) return 'In diesem Bereich ist mit dem gew?hlten Dartbudget kein Finish m?glich.'
  if(['checkoutRange','nineDarts'].includes(task.type) && possible.length!==c.end-c.start+1) return 'Mindestens eine Zahl ist mit diesem Dartbudget nicht erreichbar. Erh?he die Dartanzahl oder passe den Bereich an.'
  return null
}
