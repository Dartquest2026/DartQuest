import {useEffect,useMemo,useState} from 'react'
import {ScoreKeypad} from '../campaignModes/components/CampaignGameUI'
import {TRAINING_TEMPLATES,createTrainingTask,describeTrainingTask,moveTrainingTask,updateTrainingTaskAt} from './trainingTemplates'
import {create201State,get201Average,get201CheckoutDartCounts,record201Visit} from './trainingGames/game201'
import {createBullFinisherState,recordBullFinisherVisit} from './trainingGames/bullFinisher'
import {advanceRandomCheckoutVisit,createRandomCheckoutState,getRandomCheckoutDartOptions,recordRandomCheckout} from './trainingGames/randomCheckout'
import {saveTrainingSession} from './trainingStorage'
import TrainingInfoModal from './TrainingInfoModal'
import './Training.css'

const makeState=task=>task.type==='201'?create201State(task.configuration):task.type==='bullFinisher'?createBullFinisherState():createRandomCheckoutState(task.configuration)
const resultLabel={direct:'+3 DIREKTES BULL',checkout:'+2 CHECKOUT',rescue:'+1 BULL-RETTUNG',miss:'0 KEIN FINISH'}
const bullFinisherActions=[
  {value:'direct',points:'3 PUNKTE',label:'DIREKTES BULL',description:'Bull 50 mit Dart 1'},
  {value:'checkout',points:'2 PUNKTE',label:'REGULÄRER CHECKOUT',description:'Double-Out mit Dart 2 oder 3'},
  {value:'rescue',points:'1 PUNKT',label:'BULL-RETTUNG',description:'Letzter Dart trifft Bull 50'},
  {value:'miss',points:'0 PUNKTE',label:'KEIN FINISH',description:'Kein Checkout und keine Bull-Rettung'},
]

function Chips({value,values,onChange,suffix=''}){return <div className="training-chips">{values.map(item=><button key={item} type="button" aria-pressed={Number(value)===item} onClick={()=>onChange(item)}>{item}{suffix}</button>)}</div>}

function Config({task,onClose,onSave,actionLabel}){
  const [c,setC]=useState(task.configuration)
  const update=(key,value)=>setC(current=>({...current,[key]:value}))
  return <div className="training-sheet-backdrop" onClick={onClose}><section className="training-sheet" onClick={event=>event.stopPropagation()}>
    <span>SPIEL EINSTELLEN</span><h2>{task.title}</h2>
    {task.type==='201'&&<><label>DART-LIMIT<Chips value={c.dartLimit} values={[9,12,15,18]} onChange={value=>update('dartLimit',value)}/><small>{Number(c.dartLimit)/3} Aufnahmen</small></label><label>ERFOLGE ZUM ABSCHLUSS<Chips value={c.successGoal} values={[5,10,20]} onChange={value=>update('successGoal',value)}/></label></>}
    {task.type==='randomCheckout'&&<>
      <h3>BEREICH</h3><div className="training-range"><label>VON<input type="number" min="2" max="170" value={c.from} onChange={e=>update('from',e.target.value)}/></label><label>BIS<input type="number" min="2" max="170" value={c.to} onChange={e=>update('to',e.target.value)}/></label></div>
      <label>MAX. AUFNAHMEN<Chips value={c.maxVisits} values={[1,2,3]} onChange={value=>update('maxVisits',value)}/></label>
      <label>TRAININGSZIEL<div className="training-chips"><button aria-pressed={c.goalType!=='checkoutCount'} onClick={()=>update('goalType','time')}>ZEIT</button><button aria-pressed={c.goalType==='checkoutCount'} onClick={()=>update('goalType','checkoutCount')}>CHECKOUTS</button></div></label>
      {c.goalType!=='checkoutCount'?<label>ZEIT<Chips value={c.minutes} values={[10,15,20]} suffix=" MIN" onChange={value=>update('minutes',value)}/></label>:<label>ANZAHL CHECKOUT-AUFGABEN<Chips value={c.targetCheckoutCount} values={[10,20,30]} onChange={value=>update('targetCheckoutCount',value)}/><input type="number" min="1" max="200" value={c.targetCheckoutCount} onChange={e=>update('targetCheckoutCount',e.target.value)} aria-label="Eigene Checkout-Anzahl"/></label>}
    </>}
    <div className="training-sheet-actions"><button onClick={onClose}>ABBRECHEN</button><button onClick={()=>onSave(createTrainingTask(task.id,{configuration:c}))}>{actionLabel}</button></div>
  </section></div>
}

function Builder({onBack,onStart}){
  const [selected,setSelected]=useState([]),[editing,setEditing]=useState(null),[infoId,setInfoId]=useState(null)
  function toggle(template){const index=selected.findIndex(task=>task.id===template.id);if(index>=0){setSelected(current=>current.filter((_,itemIndex)=>itemIndex!==index));return}setEditing({task:createTrainingTask(template.id),index:null})}
  function save(task){setSelected(current=>editing.index==null?[...current,task]:updateTrainingTaskAt(current,editing.index,task));setEditing(null)}
  function move(index,direction){setSelected(current=>moveTrainingTask(current,index,direction))}
  return <main className="training-builder"><div className="training-builder-scroll"><header className="training-page-header"><button onClick={onBack}>‹</button><div><span>DARTQUEST</span><h1>Training erstellen</h1></div></header><section className="training-category"><h2>VERFÜGBARE ÜBUNGEN</h2><div>{TRAINING_TEMPLATES.map(template=>{const chosen=selected.some(task=>task.id===template.id);return <article className={chosen?'is-selected':''} key={template.id}><button className="training-template-toggle" aria-pressed={chosen} onClick={()=>toggle(template)}><i>{chosen?'−':'+'}</i><span><strong>{template.title}</strong><small>{template.description}</small></span></button><button className="training-template-info" type="button" aria-label={`${template.title} erklären`} onClick={()=>setInfoId(template.id)}>i</button></article>})}</div></section></div><div className="training-builder-bottom">{selected.length>0&&<section className="training-plan"><h2>DEIN TRAININGSPLAN</h2><div className="training-plan-scroll">{selected.map((task,index)=><div className="training-plan-entry" key={task.id}><b>{index+1}</b><span><strong>{task.title}</strong><small>{describeTrainingTask(task)}</small></span><button onClick={()=>setEditing({task,index})}>BEARBEITEN</button><button disabled={index===0} onClick={()=>move(index,-1)} aria-label={`${task.title} nach oben`}>↑</button><button disabled={index===selected.length-1} onClick={()=>move(index,1)} aria-label={`${task.title} nach unten`}>↓</button></div>)}</div></section>}<button className="training-start-button" disabled={!selected.length} onClick={()=>onStart(selected)}>TRAINING STARTEN</button></div>{editing&&<Config task={editing.task} onClose={()=>setEditing(null)} onSave={save} actionLabel={editing.index==null?'HINZUFÜGEN':'SPEICHERN'}/>}<TrainingInfoModal templateId={infoId} onClose={()=>setInfoId(null)}/></main>
}

function Stats({task,state,seconds}){
  if(task.type==='201')return <><div className="training-target">{state.remaining}</div><div className="training-metrics"><div><span>REST</span><strong>{state.remaining}</strong></div><div><span>DARTS</span><strong>{state.dartsThisRound} / {state.config.dartLimit}</strong></div><div><span>ERFOLGE</span><strong>{state.successes} / {state.config.successGoal}</strong></div></div><p>3-DART-AVERAGE · {get201Average(state).toFixed(2)}</p></>
  if(task.type==='bullFinisher')return <><div className="training-target">50 <small>REST</small></div><div className="training-metrics"><div><span>PUNKTE</span><strong>{state.points} / 20</strong></div><div><span>AUFNAHME</span><strong>{state.totalVisits+1}</strong></div></div></>
  const min=Math.floor(seconds/60),sec=seconds%60
  return <div className="random-checkout-hud">
    {state.config.goalType==='time'?<div className={`training-timer ${seconds<=60?'is-urgent':seconds<=180?'is-warning':''}`}>{String(min).padStart(2,'0')}:{String(sec).padStart(2,'0')}</div>:<div className="random-task-progress"><span>AUFGABE</span><strong>{Math.min(state.attempts.length+1,state.config.targetCheckoutCount)} / {state.config.targetCheckoutCount}</strong></div>}
    <span className="random-checkout-label">CHECKOUT</span><div className="training-target">{state.currentTarget}</div>
    <div className="training-metrics"><div><span>ERFOLGE</span><strong>{state.successes}{state.config.goalType==='checkoutCount'?` / ${state.config.targetCheckoutCount}`:''}</strong></div><div><span>PERFEKT</span><strong>{state.perfectCheckouts}</strong></div></div>
    <small>AUFNAHME {state.currentVisit} VON {state.config.maxVisits}</small>
  </div>
}

function Game({tasks,players,activeProfile,onExit}){
  const [taskIndex,setTaskIndex]=useState(0),task=tasks[taskIndex]
  const [states,setStates]=useState(()=>players.map(()=>makeState(tasks[0])))
  const [active,setActive]=useState(0),[score,setScore]=useState(''),[checkoutPrompt,setCheckoutPrompt]=useState(null),[history,setHistory]=useState([]),[notice,setNotice]=useState(''),[result,setResult]=useState(null),[taskResult,setTaskResult]=useState(null)
  const [seconds,setSeconds]=useState(()=>task.type==='randomCheckout'&&task.configuration.goalType!=='checkoutCount'?task.configuration.minutes*60:0)
  const state=states[active]

  useEffect(()=>{if(task.type!=='randomCheckout'||task.configuration.goalType==='checkoutCount'||result)return;const timer=setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);return()=>clearInterval(timer)},[task.type,task.configuration.goalType,result])
  // The timeout deliberately snapshots the active match when the shared clock reaches zero.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(task.type==='randomCheckout'&&task.configuration.goalType!=='checkoutCount'&&seconds===0&&!result)endTimedTask(states)},[seconds])

  function sessionResult(next,currentTask=task){const summaries=next.map((item,index)=>({playerId:players[index].id,playerName:players[index].name,gameId:currentTask.id,rawData:item}));return{mode:players.length>1?'versus':'solo',plan:[currentTask],playerResults:summaries,totalScore:0,maxScore:0,percentage:0}}
  async function finish(next){const final=sessionResult(next);setResult(final);if(players.length===1)await saveTrainingSession(activeProfile?.id,final)}
  function endTimedTask(next){if(taskIndex===tasks.length-1)void finish(next);else void completePlanTask(next)}
  async function completePlanTask(next){if(players.length===1)await saveTrainingSession(activeProfile?.id,sessionResult(next));setTaskResult({title:task.title,nextTitle:tasks[taskIndex+1].title})}
  function continuePlan(){const nextIndex=taskIndex+1;setTaskIndex(nextIndex);setStates(players.map(()=>makeState(tasks[nextIndex])));setActive(0);setHistory([]);setNotice('');setScore('');setTaskResult(null);setSeconds(tasks[nextIndex].type==='randomCheckout'&&tasks[nextIndex].configuration.goalType!=='checkoutCount'?tasks[nextIndex].configuration.minutes*60:0)}
  function commit(nextState,label=''){setHistory(current=>[...current,{states:structuredClone(states),active,notice}]);let next=states.map((item,index)=>index===active?nextState:item);setNotice(label);setCheckoutPrompt(null);if(task.type==='randomCheckout'&&players.length>1){if(active===0)next[1]={...next[1],currentTarget:state.currentTarget};else next[0]={...next[0],currentTarget:nextState.currentTarget}}setStates(next);const completed=nextState.complete;if(task.type==='bullFinisher'&&players.length>1&&next.some(item=>item.complete)){const equalVisits=Math.max(...next.filter(item=>item.complete).map(item=>item.totalVisits));const waiting=next.findIndex(item=>item.totalVisits<equalVisits);if(waiting<0){finish(next);return}setActive(waiting);return}if(completed){if(players.length>1){finish(next);return}if(taskIndex===tasks.length-1)finish(next);else void completePlanTask(next);return}if(players.length>1&&!(task.type==='randomCheckout'&&nextState.currentVisit>1))setActive((active+1)%players.length)}
  function submit201(){const points=Number(score);if(!Number.isInteger(points)||points<0||points>180)return;const options=get201CheckoutDartCounts(state);if(points===state.remaining&&options.length){setCheckoutPrompt({points,options});return}commit(record201Visit(state,{score:points}),'AUFNAHME ERFASST');setScore('')}
  function checkout201(darts){if(!get201CheckoutDartCounts(state).includes(darts))return;commit(record201Visit(state,{score:state.remaining,darts,checkout:true}),`CHECKOUT · ${darts} DART${darts>1?'S':''}`);setScore('')}
  function undo(){const previous=history.at(-1);if(!previous)return;setStates(previous.states);setActive(previous.active);setNotice('LETZTE AUFNAHME ZURÜCKGENOMMEN');setHistory(current=>current.slice(0,-1));setCheckoutPrompt(null);setScore('')}

  if(result)return <main className="training-results"><header><span>DARTQUEST TRAINING</span><h1>Training beendet</h1></header>{result.playerResults.map(player=><section key={player.playerId}><h2>{player.playerName}</h2><strong>{task.title}</strong><small>{task.type==='201'?`${player.rawData.successes} Erfolge · Ø ${get201Average(player.rawData).toFixed(2)}`:task.type==='bullFinisher'?`${player.rawData.points} Punkte · ${player.rawData.totalVisits} Aufnahmen`:`${player.rawData.successes}/${player.rawData.attempts.length} Checkouts · ${player.rawData.perfectCheckouts} perfekt`}</small></section>)}<button onClick={onExit}>TRAINING VERLASSEN</button></main>

  const randomDarts=task.type==='randomCheckout'?getRandomCheckoutDartOptions(state):[]
  return <main className="training-game" style={{'--training-player-color':players[active].color||'#42e695'}}><header><div><span>AM ZUG</span><strong>{players[active].name}</strong></div><div><button disabled={!history.length} onClick={undo}>UNDO</button><button onClick={onExit}>BEENDEN</button></div></header>
    <section className={`training-game-main${task.type==='randomCheckout'?' is-random-checkout':task.type==='201'?' is-201':task.type==='bullFinisher'?' is-bull-finisher':''}`}><h1>{task.type==='201'?`201 TRAINING · STUFE ${state.startValue}`:task.title}</h1><Stats task={task} state={state} seconds={seconds}/>{notice&&<p className="training-notice">{notice}</p>}
      {task.type==='201'&&<><div className="training-x01-history"><header><span>SCORE</span><span>REST</span><span>DARTS</span></header>{state.visits.slice(-4).map((visit,index)=><div key={`${visit.createdAt}-${index}`}><strong>{visit.bust?'BUST':visit.enteredScore}</strong><span>{visit.rest}</span><small>{visit.darts}</small></div>)}</div><ScoreKeypad value={score} onChange={setScore} onConfirm={submit201} disabled={false} fill checkoutDartCounts={get201CheckoutDartCounts(state)} onCheckoutLongPress={checkout201}/></>}
      {task.type==='bullFinisher'&&<div className="bull-finisher-actions">{bullFinisherActions.map(action=><button key={action.value} className={`is-${action.value}`} onClick={()=>commit(recordBullFinisherVisit(state,action.value,action.value==='direct'?1:3),resultLabel[action.value])}><strong>{action.points}</strong><span>{action.label}</span><small>{action.description}</small></button>)}</div>}
      {task.type==='randomCheckout'&&<div className="training-action-grid random-checkout-actions">{[1,2,3].map(n=><button key={n} disabled={!randomDarts.includes(n)} onClick={()=>commit(recordRandomCheckout(state,{success:true,dartsUsed:n}),`${(state.currentVisit-1)*3+n} DARTS GESAMT`)}>{n} DART{n>1?'S':''}</button>)}<button onClick={()=>{const next=advanceRandomCheckoutVisit(state);commit(next,next.currentVisit>state.currentVisit?`AUFNAHME ${next.currentVisit}`:'NICHT GESCHAFFT')}}>{state.currentVisit<state.config.maxVisits?'NÄCHSTE AUFNAHME':'NICHT GESCHAFFT'}</button></div>}
    </section>
    {checkoutPrompt&&<div className="checkout-dialog dq-checkout-dialog"><section role="dialog" aria-modal="true"><span>DOUBLE OUT</span><h2>Mit wie vielen Darts ausgecheckt?</h2><div className="checkout-dart-choice">{[1,2,3].map(dart=><button key={dart} disabled={!checkoutPrompt.options.includes(dart)} onClick={()=>checkout201(dart)}>{dart}</button>)}</div><button onClick={()=>{commit(record201Visit(state,{score:checkoutPrompt.points}),'BUST');setScore('')}}>KEIN CHECKOUT · BUST</button><button onClick={()=>setCheckoutPrompt(null)}>ABBRECHEN</button></section></div>}
    {taskResult&&<div className="training-task-result"><section><span>ÜBUNG ABGESCHLOSSEN</span><h2>{taskResult.title}</h2><p>Als Nächstes: {taskResult.nextTitle}</p><button onClick={continuePlan}>WEITER</button></section></div>}
  </main>
}

export default function Training({activeProfile,players,onBack}){
  const normalized=useMemo(()=>players?.length?players.map((p,i)=>({...p,id:p.id??i+1,name:p.name?.trim()||`Spieler ${i+1}`})):[{id:1,name:activeProfile?.name||'Spieler 1',color:'#42e695'}],[activeProfile,players])
  const [view,setView]=useState('builder'),[tasks,setTasks]=useState([])
  if(view==='game')return <Game tasks={tasks} players={normalized} activeProfile={activeProfile} onExit={onBack}/>
  return <Builder onBack={onBack} onStart={plan=>{setTasks(plan);setView('game')}}/>
}
