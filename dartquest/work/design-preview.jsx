import React from 'react'
import {createRoot} from 'react-dom/client'
import CustomTraining from '../src/features/training/CustomTraining'
import BottomNav from '../src/shared/components/BottomNav'
import {saveCustomRun,clearCustomRun} from '../src/features/training/customTrainingStorage'
import '../src/index.css'
import '../src/app/App.css'
import '../src/features/training/Training.css'
import '../src/shared/styles/BottomNav.css'
const params=new URLSearchParams(location.search),game=params.get('game'),seed=params.get('seed')
if(seed&&sessionStorage.getItem('design-test-seed')!==seed){
 if(game){const around=game==='around-the-clock';saveCustomRun(null,{id:crypto.randomUUID(),game,minutes:around?0:15,includeBull:false,misses:5,startedAt:Date.now()-100000,endAt:around?null:Date.now()+800000,phase:'playing',score:'',choosing:false,doubleBull:12,singleBull:26,favoriteDouble:16,favoriteComboCount:game==='favorite-double'?3:0,route:[16,8,4],routeThrows:[{target:16,hit:true},{target:8,hit:false},{target:4,hit:true}],entries:params.get('long')?Array.from({length:70},()=>({points:game==='triple-20-19-18-combo'?97:game==='t20-combo'?100:32,count:1,double:16})):game==='t20-combo'?[{points:100,count:1},{points:285,count:3}]:game==='triple-20-19-18-combo'?[{points:97,count:1},{points:291,count:3}]:[{points:32,count:1,double:16},{points:96,count:3,double:16}]})}else clearCustomRun(null)
 sessionStorage.setItem('design-test-seed',seed)
}
createRoot(document.getElementById('root')).render(<div className="app-shell"><CustomTraining onBack={()=>{}}/><BottomNav activePage="home" onChangePage={()=>{}}/></div>);
