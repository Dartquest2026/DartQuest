import test from 'node:test'
import assert from 'node:assert/strict'
import {beginFreeTraining,endFreeTraining,trainingStorage,acceptsTrainingCode} from '../src/features/training/freeTrainingSession.js'
test('free training keeps device history across visits and isolates account data and unfinished runs',()=>{
 const values=new Map([['dartquest-custom-training-guest-history','existing guest'],['profile','existing account']])
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
 assert.equal(acceptsTrainingCode('1910'),true)
 for(const code of ['','191','19100','0000'])assert.equal(acceptsTrainingCode(code),false)
 beginFreeTraining()
 assert.equal(trainingStorage().getItem('dartquest-custom-training-guest-history'),null)
 trainingStorage().setItem('dartquest-custom-training-guest-history','temporary session')
 assert.equal(trainingStorage().getItem('dartquest-custom-training-guest-history'),'temporary session')
 assert.equal(values.get('dartquest-custom-training-guest-history'),'existing guest')
 trainingStorage().setItem('active','unfinished run')
 endFreeTraining()
 assert.equal(trainingStorage().getItem('dartquest-custom-training-guest-history'),'existing guest')
 beginFreeTraining()
 assert.equal(trainingStorage().getItem('dartquest-custom-training-guest-history'),'temporary session')
 assert.equal(trainingStorage().getItem('active'),null)
 endFreeTraining()
 assert.equal(values.get('profile'),'existing account')
 delete globalThis.localStorage
})

