import {standardVisitCount} from '../src/features/training/standardVisits.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {tapFavoriteCombo,flushFavoriteCombo,favoriteComboRemaining,isVisitLocked,enterBullHit,enterRouteHit,emptyVisit,flushVisit,undoVisit,visitStatistics,toggleTrainingPause,clockNow,enterCombo,enterFavoriteCombo,enterFavoriteSingle} from '../src/features/training/trainingVisits.js'
import {possibleComboCounts,elapsedClockMs,beginTimedFinalEntry,changeFavoriteCombo,finishAroundClock} from '../src/features/training/customTrainingRules.js'
const start=(game)=>({game,visitVersion:1,visits:[],entries:[],routeThrows:[],route:[16,8,4],singleBull:0,doubleBull:0,phase:'playing',endAt:Date.now()+900000,startedAt:1000,pausedMs:0,favoriteDouble:16,favoriteComboCount:0,score:''})
test('bull zero, one, two and three hits count full three-dart visits',()=>{
 let r=start('bulls-warm-up');r=emptyVisit(r,1000);r=enterBullHit(r,'singleBull',1,6000);assert.equal(flushVisit(r,10999).visits.length,1);r=flushVisit(r,11000)
 r=enterBullHit(r,'singleBull',1,12000);r=enterBullHit(r,'doubleBull',1,16000);assert.equal(flushVisit(r,20000).visits.length,2);r=flushVisit(r,21000)
 for(const field of ['singleBull','doubleBull','singleBull'])r=enterBullHit(r,field,1,22000)
 assert.deepEqual(visitStatistics(r),{total:4,successful:3,failed:1,hits:6,darts:12,misses:6,accuracy:50,kind:'darts'})
})
test('twenty single bull hits in twenty visits means sixty darts and 33.3 percent',()=>{
 let r=start('bulls-warm-up');for(let i=0;i<20;i++){r=enterBullHit(r,'singleBull',1,i*6000);r=flushVisit(r,i*6000+5000)}
 const s=visitStatistics(r);assert.equal(s.total,20);assert.equal(s.hits,20);assert.equal(s.misses,40);assert.ok(Math.abs(s.accuracy-100/3)<.0001)
})
test('pause freezes countdown and pending deadline; persisted pause resumes without consuming time',()=>{
 let r=enterBullHit(start('bulls-warm-up'),'singleBull',1,1000);r=toggleTrainingPause(r,3000);const end=r.endAt
 assert.equal(clockNow(r,90000),3000);assert.equal(flushVisit(r,90000),r);assert.equal(enterBullHit(r,'singleBull',1,90000),r)
 r=toggleTrainingPause(JSON.parse(JSON.stringify(r)),93000);assert.equal(r.endAt,end+90000);assert.equal(r.pausedMs,90000)
 assert.equal(flushVisit(r,95999).visits.length,0);assert.equal(flushVisit(r,96000).visits.length,1)
})
test('undo reopens auto-closed visit, corrects counts and restarts only its five-second window',()=>{
 let r=enterBullHit(start('bulls-warm-up'),'singleBull',1,1000);r=flushVisit(r,6000);r=undoVisit(r,7000)
 assert.equal(r.singleBull,0);assert.equal(r.visits.length,0)
 r=enterBullHit(r,'singleBull',1,8000);r=enterBullHit(r,'doubleBull',1,9000);r=flushVisit(r,14000);r=undoVisit(r,15000)
 assert.equal(r.singleBull,1);assert.equal(r.doubleBull,0);assert.equal(r.visits.length,0);assert.equal(r.pendingVisit.at,15000)
 r=flushVisit(r,20000);assert.equal(r.visits.length,1)
})
test('route assigns missing targets exactly once and zero visit counts all three misses',()=>{
 let r=start('double-route');r=enterRouteHit(r,16,1,1000);assert.equal(enterRouteHit(r,16,1,1100),r);r=flushVisit(r,6000)
 assert.deepEqual(r.routeThrows,[{target:16,hit:true},{target:8,hit:false},{target:4,hit:false}]);r=emptyVisit(r,7000)
 for(const target of [4,16,8])r=enterRouteHit(r,target,1,12000)
 const s=visitStatistics(r);assert.equal(s.total,3);assert.equal(s.hits,4);assert.equal(s.misses,5)
 r=undoVisit(r,13000);assert.equal(r.visits.length,2);assert.equal(r.pendingVisit.hits.length,2)
})
test('route minus edits pending targets without creating empty visits',()=>{
 let r=enterRouteHit(start('double-route'),8,1,1000);r=enterRouteHit(r,8,-1,2000);assert.equal(r.pendingVisit,null);assert.equal(r.visits.length,0)
})
test('three successful T20 visits automatically add exactly one terminal failed visit',()=>{
 let r=enterCombo(start('t20-combo'),300,3);assert.deepEqual(r.visits,[{successful:3,failed:1}]);r=emptyVisit(r);assert.deepEqual(visitStatistics(r).total,5)
 r=undoVisit(r);assert.equal(visitStatistics(r).total,4);r=undoVisit(r);assert.equal(r.entries.length,0);assert.equal(r.visits.length,0)
})
test('20/19/18 combos count the failed closing attempt; a time-ended final combo does not',()=>{
 let r=enterCombo(start('triple-20-19-18-combo'),194,2);assert.equal(visitStatistics(r).total,3)
 r={...start('t20-combo'),endAt:0};r={...beginTimedFinalEntry(r),finalVisitBase:0};r=enterCombo(r,180,1,false);assert.equal(visitStatistics(r).total,1);assert.equal(visitStatistics(r).failed,0);assert.equal(emptyVisit(r),r)
})
test('favorite nine hits means three successful visits plus fourth failed; partial visits are not duplicated',()=>{
 for(const [hits,total,failed] of [[9,4,1],[4,2,0],[3,2,1],[2,1,0]]){
 let r=start('favorite-double');r=changeFavoriteCombo(r,hits);r=enterFavoriteCombo(r);assert.equal(visitStatistics(r).total,total);assert.equal(visitStatistics(r).failed,failed)
 }
 let r=enterFavoriteSingle(start('favorite-double'));assert.equal(visitStatistics(r).total,1)
})
test('final bull and route visit allow corrections but never a second last visit',()=>{
 for(const game of ['bulls-warm-up','double-route']){
 let r={...start(game),endAt:0};r={...beginTimedFinalEntry(r),finalVisitBase:0};r=emptyVisit(r);assert.equal(emptyVisit(r),r)
 assert.equal(game==='bulls-warm-up'?enterBullHit(r,'singleBull',1):enterRouteHit(r,16),r)
 r=undoVisit(r);assert.equal(r.visits.length,0);r=emptyVisit(r);assert.equal(r.visits.length,1)
 }
})
test('old statistics have no invented visit numbers; stopwatch subtracts pauses',()=>{
 assert.equal(visitStatistics({game:'bulls-warm-up',singleBull:20,doubleBull:3}),null)
 let r={...start('around-the-clock'),endAt:null};r=toggleTrainingPause(r,6000);assert.equal(elapsedClockMs(r,100000),5000);r=toggleTrainingPause(r,16000);r=finishAroundClock(r,21000);assert.equal(r.elapsedMs,10000)
 assert.equal(visitStatistics(r).total,7)
})

test('standard visits use actual visits or checkout darts, with the partial last visit counted once',()=>{
 assert.equal(standardVisitCount('201',{visits:[{},{}]}),2)
 assert.equal(standardVisitCount('bull-finisher',{totalVisits:4}),4)
 assert.equal(standardVisitCount('random-checkouts',{attempts:[{success:true,dartsUsed:4},{success:false,allowedDarts:9}],currentVisit:2}),6)
 assert.equal(standardVisitCount('random-checkouts',{attempts:[{success:false}]}),null)
})

test('thirty bull visits with 25 single and 10 double bulls mean 55 misses and 38.9 percent',()=>{
 const r={...start('bulls-warm-up'),singleBull:25,doubleBull:10,visits:[...Array.from({length:10},()=>({singleBull:1,doubleBull:1})),...Array.from({length:15},()=>({singleBull:1,doubleBull:0})),...Array.from({length:5},()=>({singleBull:0,doubleBull:0}))]}
 const stats=visitStatistics(r);assert.equal(stats.total,30);assert.equal(stats.darts,90);assert.equal(stats.hits,35);assert.equal(stats.misses,55);assert.equal(stats.accuracy.toFixed(1),'38.9')
})

test('third bull hit locks a fourth hit for exactly five seconds, including after reload and pause',()=>{
 let r=start('bulls-warm-up');for(const field of ['singleBull','doubleBull','singleBull'])r=enterBullHit(r,field,1,1000)
 assert.equal(r.visits.length,1);assert.equal(isVisitLocked(r,5999),true);assert.equal(enterBullHit(r,'singleBull',1,5999),r);assert.equal(emptyVisit(r,5999),r)
 r=JSON.parse(JSON.stringify(r));assert.equal(isVisitLocked(r,5999),true);assert.equal(isVisitLocked(r,6000),false);assert.equal(enterBullHit(r,'singleBull',1,6000).singleBull,3)
 r=toggleTrainingPause(r,3000);r=toggleTrainingPause(r,13000);assert.equal(isVisitLocked(r,15999),true);assert.equal(isVisitLocked(r,16000),false)
 r=undoVisit(r,14000);assert.equal(r.visitBlockedUntil,null);assert.equal(r.visits.length,0);assert.equal(r.pendingVisit.singleBull+r.pendingVisit.doubleBull,2)
})
test('a second hit resets the complete five-second wait rather than finishing from the first hit',()=>{
 let r=enterBullHit(start('bulls-warm-up'),'singleBull',1,1000);r=enterBullHit(r,'doubleBull',1,4999)
 assert.equal(flushVisit(r,9998),r);assert.equal(flushVisit(r,9999).visits.length,1)
})

test('empty visit blocks duplicate taps for five seconds and undo removes both the visit and the lock',()=>{
 for(const game of ['bulls-warm-up','double-route']){
 let r=emptyVisit(start(game),1000);assert.equal(r.visits.length,1);assert.equal(emptyVisit(r,5999),r);assert.equal(emptyVisit(r,6000).visits.length,2)
 r=undoVisit(JSON.parse(JSON.stringify(r)),2000);assert.equal(r.visits.length,0);assert.equal(isVisitLocked(r,2000),false)
 }
})

test('T20 detects exactly the possible series lengths and rejects input during the empty-visit lock',()=>{
 assert.deepEqual(possibleComboCounts(95),[1]);assert.deepEqual(possibleComboCounts(100),[1]);assert.deepEqual(possibleComboCounts(120),[1,2]);assert.deepEqual(possibleComboCounts(180),[1,2,3]);assert.deepEqual(possibleComboCounts(59),[])
 const r=emptyVisit(start('t20-combo'));assert.equal(enterCombo(r,95,1),r)
})

test('favorite single hit locks hit and combo input for five seconds and undo restores availability',()=>{
 let r=enterFavoriteSingle(start('favorite-double'),1000);assert.equal(r.entries.length,1);assert.equal(visitStatistics(r).total,1)
 assert.equal(isVisitLocked(r,5999),true);assert.equal(enterFavoriteSingle(r,5999),r);assert.equal(isVisitLocked(r,6000),false);assert.equal(enterFavoriteSingle(r,6000).entries.length,2)
 r=undoVisit(JSON.parse(JSON.stringify(r)),2000);assert.equal(r.entries.length,0);assert.equal(r.visits.length,0);assert.equal(isVisitLocked(r,2000),false)
})
test('favorite double automatically counts closing misses for exact groups of three even in final entry',()=>{
 for(const [hits,total,failed] of [[2,1,0],[3,2,1],[6,3,1],[9,4,1]]){
  let r=start('favorite-double');r=changeFavoriteCombo(r,hits);r={...r,phase:'final-entry',finalVisitBase:0,finalEntryBase:{entries:0,favoriteHits:hits,routeThrows:0}};r=enterFavoriteCombo(r)
  assert.equal(visitStatistics(r).total,total);assert.equal(visitStatistics(r).failed,failed)
 }
})

test('favorite combo saves once five seconds after the last tap, with no manual confirmation',()=>{
 let r=tapFavoriteCombo(start('favorite-double'),1000);r=tapFavoriteCombo(r,4000)
 assert.equal(r.favoriteComboCount,2);assert.equal(r.entries.length,0);assert.equal(favoriteComboRemaining(r,4000),5000)
 assert.equal(flushFavoriteCombo(r,8999),r);r=flushFavoriteCombo(r,9000)
 assert.equal(r.entries.length,1);assert.equal(r.entries[0].count,2);assert.equal(r.entries[0].points,64);assert.equal(r.favoriteComboCount,0);assert.equal(visitStatistics(r).total,1);assert.equal(flushFavoriteCombo(r,15000),r)
})
test('favorite combo countdown freezes on pause, survives reload and preserves undo after automatic saving',()=>{
 let r=tapFavoriteCombo(start('favorite-double'),1000);r=tapFavoriteCombo(r,4000);r=toggleTrainingPause(r,6000)
 assert.equal(favoriteComboRemaining(r,12000),3000);assert.equal(flushFavoriteCombo(r,12000),r)
 r=toggleTrainingPause(JSON.parse(JSON.stringify(r)),16000);assert.equal(favoriteComboRemaining(r,16000),3000);assert.equal(flushFavoriteCombo(r,18999),r);r=flushFavoriteCombo(r,19000)
 assert.equal(r.entries[0].count,2);r=undoVisit(r,20000);assert.equal(r.entries.length,0);assert.equal(r.visits.length,0);assert.equal(r.favoriteComboCount,1);assert.equal(favoriteComboRemaining(r,20000),5000)
 r=undoVisit(r,21000);assert.equal(r.favoriteComboCount,0);assert.equal(r.favoriteComboAt,null);assert.equal(flushFavoriteCombo(r,30000),r)
})
test('favorite final entry automatically completes its last three hits and still counts the closing failed visit',()=>{
 let r={...start('favorite-double'),endAt:0};r={...beginTimedFinalEntry(r),finalVisitBase:0};for(let i=0;i<3;i++)r=tapFavoriteCombo(r,1000)
 assert.equal(tapFavoriteCombo(r,1000),r);r=flushFavoriteCombo(r,6000);assert.equal(r.entries[0].count,3);assert.equal(visitStatistics(r).total,2)
})
