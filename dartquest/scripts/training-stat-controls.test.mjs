import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { friendMetricRecords } from '../src/features/training/timelineComparison.js'
const source=readFileSync(new URL('../src/features/training/trainingStatControls.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replaceAll('export ','').replaceAll('trainingStorage()', 'localStorage')
function fixture({error=null,markers=[]}={}){
 const values=new Map(),calls=[]
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
 const supabase={rpc:async(name,args)=>{calls.push({name,args});return {data:'2026-11-02T12:00:00Z',error}},from:()=>({select(){return this},eq(){return this},then(resolve){resolve({data:markers,error:null})}})}
 const api=runInNewContext(source+'\n;({resetTrainingStatistics,applyTrainingResets,filterComparisonRows})',{supabase,localStorage:storage,Date,Map,JSON,Event:class{},window:{dispatchEvent(){}}})
 return {values,calls,storage,...api}
}
const row=(id,game,created_at='2026-11-01T12:00:00Z')=>({id,game,created_at,payload:{includeBull:false,route:[16,8,4]},plan:[{id:game}]})
test('custom reset removes every duration of just one game and leaves standard, active and XP data',async()=>{
 const f=fixture();const key='dartquest-custom-training-u-history';f.storage.setItem(key,JSON.stringify([{...row('a','bulls-warm-up'),minutes:5},{...row('b','bulls-warm-up'),minutes:15},row('c','t20-combo')]))
 f.storage.setItem('dartquest-custom-training-u-active','active');f.storage.setItem('dartquest-training-sessions-u','standard');f.storage.setItem('profile-xp','999')
 await f.resetTrainingStatistics('u','custom','bulls-warm-up')
 assert.deepEqual(JSON.parse(f.storage.getItem(key)).map(r=>r.id),['c'])
 assert.equal(f.storage.getItem('dartquest-custom-training-u-active'),'active');assert.equal(f.storage.getItem('dartquest-training-sessions-u'),'standard');assert.equal(f.storage.getItem('profile-xp'),'999')
 assert.equal(f.calls[0].args.p_game,'bulls-warm-up')
})
test('standard reset targets the selected game and guest reset makes no cloud call',async()=>{
 const f=fixture();f.storage.setItem('dartquest-training-sessions-guest',JSON.stringify([row('a','201'),row('b','bull-finisher')]))
 await f.resetTrainingStatistics(null,'standard','201')
 assert.deepEqual(JSON.parse(f.storage.getItem('dartquest-training-sessions-guest')).map(r=>r.id),['b']);assert.equal(f.calls.length,0)
})
test('failed server reset preserves local history',async()=>{
 const f=fixture({error:{message:'offline'}}),key='dartquest-custom-training-u-history';f.storage.setItem(key,'[{"id":"keep"}]')
 await assert.rejects(f.resetTrainingStatistics('u','custom','bulls-warm-up'),/Verbindung/)
 assert.equal(f.storage.getItem(key),'[{"id":"keep"}]')
})
test('a reset from another device cannot resurrect cached records even with a fast device clock',async()=>{
 const f=fixture({markers:[{game:'bulls-warm-up',reset_at:'2026-11-02T12:00:00Z'}]})
 const result=await f.applyTrainingResets('u','custom',[row('stale','bulls-warm-up','2099-01-01T00:00:00Z'),row('keep','t20-combo')],[])
 assert.deepEqual(Array.from(result,r=>r.id),['keep'])
 const newer=row('new','bulls-warm-up','2026-11-02T12:10:00Z')
 const next=await f.applyTrainingResets('u','custom',[newer],[newer])
 assert.deepEqual(Array.from(next,r=>r.id),['new'])
})
test('comparison filters do not mix durations, Bull variants or double routes',()=>{
 const f=fixture();const rows=[{...row('5','bulls-warm-up'),minutes:5},{...row('15','bulls-warm-up'),minutes:15}]
 assert.deepEqual(Array.from(f.filterComparisonRows(rows,'bulls-warm-up',15,[16,8,4],false),r=>r.id),['15'])
 const clocks=[row('no','around-the-clock'),{...row('bull','around-the-clock'),payload:{includeBull:true}}]
 assert.deepEqual(Array.from(f.filterComparisonRows(clocks,'around-the-clock',0,[16,8,4],false),r=>r.id),['no'])
 const routes=[{...row('match','double-route'),minutes:15},{...row('other','double-route'),minutes:15,payload:{route:[20,10,5]}}]
 assert.deepEqual(Array.from(f.filterComparisonRows(routes,'double-route',15,[16,8,4],false),r=>r.id),['match'])
 assert.deepEqual(Array.from(f.filterComparisonRows(routes,'double-route',15,null,false),r=>r.id),['match','other'])
})
test('profile reset never clears training history or per-game reset markers',async()=>{
 const code=readFileSync(new URL('../src/features/profile/progressReset.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replaceAll('export ','')
 const localStorage={'dartquest-campaign-progress-singleplayer-a':'campaign','dartquest-custom-training-u-history':'training','dartquest-training-reset-markers-u':'markers',removeItem(key){delete this[key]}}
 const api=runInNewContext(code+'\n;({resetCurrentProfileProgress})',{localStorage,resetProfileProgressFields:async()=>{}})
 await api.resetCurrentProfileProgress('u');assert.equal(localStorage['dartquest-custom-training-u-history'],'training');assert.equal(localStorage['dartquest-training-reset-markers-u'],'markers');assert.equal(localStorage['dartquest-campaign-progress-singleplayer-a'],undefined)
})

test('friend record bars use all units and keep separate best results per metric',()=>{
 const metrics=[{id:'single',value:r=>r.single},{id:'double',value:r=>r.double},{id:'misses',value:r=>r.misses,lower:true}]
 const rows=[{id:'old',single:33,double:5,misses:8},{id:'new',single:10,double:15,misses:2}]
 assert.deepEqual(friendMetricRecords(rows,metrics).map(m=>[m.record.id,m.best]),[['old',33],['new',15],['new',2]])
})
