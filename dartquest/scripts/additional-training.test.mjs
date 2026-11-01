import test from 'node:test'
import assert from 'node:assert/strict'
import { DOUBLE_ROUTES, CUSTOM_GAMES, favoriteDoubleEntry, validCombo, recordRouteThrow, routeMetrics, seriesDistribution, summary, hasOpenEntry, bestResults } from '../src/features/training/customTrainingRules.js'

test('six custom games and exactly four proposed double routes are available',()=>{
 assert.equal(CUSTOM_GAMES.length,6)
 assert.deepEqual(DOUBLE_ROUTES,[[20,10,5],[16,8,4],[12,6,3],[4,2,1]])
})
test('20/19/18 combo accepts the 97 example and sums several successful visits',()=>{
 for(const [points,count] of [[97,1],[194,2],[93,1],[171,1],[3420,20]])assert.ok(validCombo(points,count,'triple-20-19-18-combo'))
 for(const [points,count] of [[57,1],[97,2],[100,1],[172,1],[194,1],[0,0],[3420,21]])assert.equal(validCombo(points,count,'triple-20-19-18-combo'),false)
})
test('every single 20/19/18 visit must contain all targets and at least one triple',()=>{
 const expected=new Set()
 for(let a=1;a<=3;a++)for(let b=1;b<=3;b++)for(let c=1;c<=3;c++)if([a,b,c].includes(3))expected.add(a*20+b*19+c*18)
 for(let points=0;points<=180;points++)assert.equal(validCombo(points,1,'triple-20-19-18-combo'),expected.has(points))
})
test('favorite double derives exactly two or four hits from D16 points',()=>{
 assert.deepEqual(favoriteDoubleEntry(64,16),{points:64,count:2,double:16})
 assert.deepEqual(favoriteDoubleEntry(128,16),{points:128,count:4,double:16})
 assert.deepEqual(favoriteDoubleEntry(128,8),{points:128,count:8,double:8})
 for(const [points,target] of [[65,16],[0,16],[-32,16],[32,0],[32,21],[32.5,16]])assert.equal(favoriteDoubleEntry(points,target),null)
})
test('favorite histories preserve the double for each entry and count successful starts',()=>{
 const entries=[favoriteDoubleEntry(64,16),favoriteDoubleEntry(128,16),favoriteDoubleEntry(64,8)]
 assert.deepEqual(seriesDistribution(entries),[[2,1],[4,2]])
 assert.deepEqual(summary({game:'favorite-double',entries}),{points:256,longest:4,bestSeries:128,seriesCount:3})
})
test('double route advances after every hit or miss, counts one point and wraps',()=>{
 let run={game:'double-route',phase:'playing',endAt:10000,route:[16,8,4],routeThrows:[]}
 run=recordRouteThrow(run,false,1);run=recordRouteThrow(run,false,2);run=recordRouteThrow(run,true,3);run=recordRouteThrow(run,true,4)
 assert.deepEqual(run.routeThrows,[{target:16,hit:false},{target:8,hit:false},{target:4,hit:true},{target:16,hit:true}])
 assert.deepEqual(routeMetrics(run),[{target:16,attempts:2,hits:1},{target:8,attempts:1,hits:0},{target:4,attempts:1,hits:1}])
 assert.equal(summary(run).points,2)
 const undo={...run,routeThrows:run.routeThrows.slice(0,-1)}
 assert.equal(recordRouteThrow(undo,false,5).routeThrows.at(-1).target,16)
 assert.equal(recordRouteThrow(run,true,10000),run)
})
test('each route preserves its own order and records stay separated by route',()=>{
 for(const route of DOUBLE_ROUTES){let run={game:'double-route',phase:'playing',endAt:10000,route,routeThrows:[]};for(let i=0;i<6;i++)run=recordRouteThrow(run,true,1);assert.deepEqual(run.routeThrows.map(t=>t.target),[...route,...route])}
 const rows=DOUBLE_ROUTES.map((route,i)=>({id:String(i),game:'double-route',minutes:5,payload:{game:'double-route',route,routeThrows:[{target:route[0],hit:i!==1}]}}))
 assert.equal(bestResults(rows,'double-route',5,null,[16,8,4]).points,0)
})
test('new series games keep a started entry open at timeout; double routes finish immediately',()=>{
 for(const game of ['favorite-double','triple-20-19-18-combo'])assert.ok(hasOpenEntry({game,score:'128'}))
 assert.equal(hasOpenEntry({game:'double-route',score:'128'}),false)
})
