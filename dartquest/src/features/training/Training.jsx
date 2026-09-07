import { useMemo, useState } from 'react'
import Dartboard from '../campaign/components/Dartboard'
import { DartSlots, ScoreKeypad } from '../campaignModes/components/CampaignGameUI'
import { triggerHaptic } from '../settings/haptics'
import { useMissHold } from '../../shared/hooks/useMissHold'
import { createTrainingProgress, fillTrainingVisitWithMisses, recordTrainingEvent, summarizeTrainingPlayer } from './trainingEngine'
import { createTrainingTask, describeTrainingTask, getTrainingTarget, getTrainingTaskEventCount, getTrainingTaskMaxScore, TRAINING_TEMPLATES } from './trainingTemplates'
import { saveTrainingSession } from './trainingStorage'
import './Training.css'

const percent = (value) => `${value.toLocaleString('de-DE', { maximumFractionDigits:1 })} %`

function ConfigSheet({ task, onCancel, onSave }) {
  const [configuration, setConfiguration] = useState(task.configuration)
  const [scored, setScored] = useState(task.scored)
  const update = (key, value) => setConfiguration((current) => ({ ...current, [key]:value }))
  const scoring = configuration.scoring ?? {}
  const updateScore = (key, value) => setConfiguration((current) => ({ ...current, scoring:{ ...current.scoring, [key]:value } }))
  return <div className="training-sheet-backdrop" role="presentation" onClick={onCancel}><section className="training-sheet" role="dialog" aria-modal="true" aria-labelledby="training-edit-title" onClick={(event) => event.stopPropagation()}>
    <span>AUFGABE BEARBEITEN</span><h2 id="training-edit-title">{task.title}</h2>
    <div className="training-config-fields">
      {'target' in configuration && <label>Zielsegment<input type="number" min="1" max="20" value={configuration.target} onChange={(e) => update('target', e.target.value)} /></label>}
      {'rounds' in configuration && <label>Aufnahmen<input type="number" min="1" max="50" value={configuration.rounds} onChange={(e) => update('rounds', e.target.value)} /></label>}
      {'repeatRounds' in configuration && <label>Wiederholungen<input type="number" min="1" max="30" value={configuration.repeatRounds} onChange={(e) => update('repeatRounds', e.target.value)} /></label>}
      {'totalDarts' in configuration && <label>Darts insgesamt<input type="number" min="1" max="180" value={configuration.totalDarts} onChange={(e) => update('totalDarts', e.target.value)} /></label>}
      {'dartsPerRound' in configuration && <label>Darts pro Aufnahme<input type="number" min="1" max="6" value={configuration.dartsPerRound} onChange={(e) => update('dartsPerRound', e.target.value)} /></label>}
      {Object.keys(scoring).map((key) => <label key={key}>{key === 'miss' ? 'Miss' : /^\d+$/.test(key) ? `${key} Dart${key === '1' ? '' : 's'}` : key}<input type="number" min="0" max="20" value={scoring[key]} onChange={(e) => updateScore(key, e.target.value)} /></label>)}
    </div>
    <label className="training-scored"><input type="checkbox" checked={scored} onChange={(e) => setScored(e.target.checked)} /> Für Gesamtwertung zählen</label>
    <div className="training-sheet-actions"><button type="button" onClick={onCancel}>ABBRECHEN</button><button type="button" onClick={() => onSave({ ...task, scored, configuration })}>ÜBERNEHMEN</button></div>
  </section></div>
}

function TrainingBuilder({ onBack, onStart }) {
  const [tasks, setTasks] = useState([])
  const [editing, setEditing] = useState(null)
  const categories = [...new Set(TRAINING_TEMPLATES.map((item) => item.category))]
  const toggle = (template) => setTasks((current) => current.some((task) => task.id === template.id) ? current.filter((task) => task.id !== template.id) : [...current, createTrainingTask(template.id)])
  const move = (index, direction) => setTasks((current) => { const target=index+direction; if(target<0||target>=current.length)return current; const copy=[...current]; [copy[index],copy[target]]=[copy[target],copy[index]]; return copy })
  const configured = (task) => {
    const normalized = createTrainingTask(task.templateId, { scored:task.scored, configuration:task.configuration })
    setTasks((current) => current.map((item) => item.id === normalized.id ? normalized : item))
    setEditing(null)
  }
  return <main className="training-builder"><div className="training-builder-scroll"><header className="training-page-header"><button type="button" onClick={onBack} aria-label="Zurück">‹</button><div><span>DARTQUEST</span><h1>Training erstellen</h1></div></header>
    <p className="training-builder-copy">Wähle Übungen, passe sie an und lege ihre Reihenfolge fest.</p>
    {categories.map((category) => <section className="training-category" key={category}><h2>{category}</h2><div>{TRAINING_TEMPLATES.filter((item) => item.category === category).map((template) => {
      const selected = tasks.find((task) => task.id === template.id)
      return <article className={selected ? 'is-selected' : ''} key={template.id}>
        <button className="training-template-toggle" type="button" onClick={() => toggle(template)} aria-pressed={Boolean(selected)}><i>{selected ? '✓' : '+'}</i><span><strong>{template.title}</strong><small>{template.description}</small></span></button>
        {selected && <div className="training-template-meta"><span>{describeTrainingTask(selected)} · Max. {getTrainingTaskMaxScore(selected)} Punkte</span><button type="button" onClick={() => setEditing(selected)}>BEARBEITEN ›</button></div>}
      </article>
    })}</div></section>)}
    {tasks.length > 0 && <section className="training-plan"><h2>DEIN PLAN · {tasks.length} {tasks.length === 1 ? 'AUFGABE' : 'AUFGABEN'}</h2>{tasks.map((task,index) => <div key={task.id}><b>{index+1}</b><span>{task.title}</span><button type="button" disabled={index===0} onClick={() => move(index,-1)} aria-label={`${task.title} nach oben`}>↑</button><button type="button" disabled={index===tasks.length-1} onClick={() => move(index,1)} aria-label={`${task.title} nach unten`}>↓</button></div>)}</section>}</div>
    <button className="training-start-button" type="button" disabled={!tasks.length} onClick={() => onStart(tasks)}>TRAINING STARTEN</button>
    {editing && <ConfigSheet task={editing} onCancel={() => setEditing(null)} onSave={configured} />}
  </main>
}

function TrainingMissButton({ disabled, onMiss, onFill }) {
  const { missHolding, missTapped, missButtonProps } = useMissHold({ disabled, onMiss, onFill })
  return <button type="button" className={`training-miss hit-counter-next-visit${missHolding?' is-holding':''}${missTapped?' is-tapped':''}`} disabled={disabled} {...missButtonProps}>NICHT GETROFFEN</button>
}

function TrainingGameplay({ tasks, players, activeProfile, onExit }) {
  const [progresses, setProgresses] = useState(() => players.map(() => createTrainingProgress(tasks)))
  const [activeIndex, setActiveIndex] = useState(0)
  const [scoreInput, setScoreInput] = useState('')
  const [taskResult, setTaskResult] = useState(null)
  const [finalResult, setFinalResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const player = players[activeIndex]
  const progress = progresses[activeIndex]
  const task = tasks[progress.currentTaskIndex]
  const taskState = progress.taskStates[progress.currentTaskIndex]
  const eventCount = getTrainingTaskEventCount(task)
  const target = getTrainingTarget(task, taskState.events.length)
  const dartsPerRound = task.type === 'highscore' || task.type === 'checkout' ? 1 : task.configuration.dartsPerRound || 3
  const dartsInCurrentVisit = taskState.events.length % dartsPerRound
  const currentVisit = dartsInCurrentVisit ? taskState.events.slice(-dartsInCurrentVisit) : []
  const slots = Array.from({length:Math.min(3,dartsPerRound)},(_,index) => currentVisit[index]?.result === 'miss' ? 0 : currentVisit[index] ? `${currentVisit[index].result.toUpperCase()} +${currentVisit[index].points}` : null)
  const boardTarget = target === 'BULL' ? { id:'target',label:'BULL',requiredHits:1 } : target ? (/^[SDT]/.test(target) ? { id:'target',label:target,requiredHits:1 } : { id:'target',label:target,targetType:'number',number:Number(target),requiredHits:1 }) : null

  async function completeTraining(nextProgresses) {
    const playerResults = players.map((item,index) => summarizeTrainingPlayer(item,nextProgresses[index],tasks))
    const totalScore = playerResults.reduce((sum,item) => sum + item.totalScore,0)
    const maxScore = playerResults.reduce((sum,item) => sum + item.maxScore,0)
    const result = { mode:players.length > 1 ? 'versus' : 'solo', plan:tasks, playerResults, totalScore, maxScore, percentage:maxScore ? totalScore/maxScore*100 : 0 }
    setFinalResult(result); setSaving(true)
    await saveTrainingSession(activeProfile?.id,result)
    setSaving(false)
  }

  function nextPlayer(nextProgresses) {
    if (nextProgresses.every((item) => item.finished)) { completeTraining(nextProgresses); return }
    for (let offset=1; offset<=players.length; offset+=1) { const candidate=(activeIndex+offset)%players.length; if(!nextProgresses[candidate].finished){ setActiveIndex(candidate); return } }
  }

  function apply(input, fill=false) {
    const outcome = fill ? fillTrainingVisitWithMisses(progress,tasks) : recordTrainingEvent(progress,tasks,input)
    const nextProgresses = progresses.map((item,index) => index===activeIndex ? outcome.progress : item)
    setProgresses(nextProgresses)
    if (task.type !== 'highscore') triggerHaptic(input.result === 'miss' || fill ? 'error' : 'light')
    if (outcome.taskComplete && players.length === 1 && !outcome.progress.finished) setTaskResult({ task, state:outcome.progress.taskStates[progress.currentTaskIndex] })
    if (outcome.progress.finished && players.length === 1) completeTraining(nextProgresses)
    else if (outcome.visitComplete && !(outcome.taskComplete && players.length === 1)) nextPlayer(nextProgresses)
  }

  if (finalResult) return <main className="training-results"><header><span>DARTQUEST TRAINING</span><h1>Training beendet</h1></header>{finalResult.playerResults.map((result) => <section key={result.playerId}><h2>{result.playerName}</h2><strong>{result.totalScore} / {result.maxScore}</strong><b>{percent(result.percentage)}</b>{result.tasks.map((item) => <div key={item.taskId}><span>{item.title}</span><small>{item.maxScore ? `${item.score} / ${item.maxScore} · ${percent(item.percentage)}` : 'Aufwärmaufgabe'}</small></div>)}</section>)}{players.length>1&&<p className="training-winner">GEWINNER · {[...finalResult.playerResults].sort((a,b)=>b.percentage-a.percentage)[0].playerName}</p>}<button type="button" disabled={saving} onClick={onExit}>{saving?'ERGEBNIS WIRD GESPEICHERT …':'TRAINING VERLASSEN'}</button></main>

  const checkoutChoices = task.type === 'checkout' ? (task.configuration.maxDarts === 3 ? [1,2,3] : [2,3,4,5,6]) : []
  const totalVisits = Math.ceil(eventCount / dartsPerRound)
  const currentVisitNumber = Math.min(Math.floor(taskState.events.length / dartsPerRound) + 1, totalVisits)
  return <main className="training-game" style={{'--training-player-color':player.color || '#42e695'}}><header><div><span>TRAINING · {player.name}</span><strong>AUFGABE {progress.currentTaskIndex+1} / {tasks.length}</strong></div><button type="button" onClick={onExit}>BEENDEN</button></header><section className="training-game-main"><h1>{task.title}</h1><p>{target ? `ZIEL · ${target}` : describeTrainingTask(task)}</p>
    {boardTarget && <Dartboard targets={[boardTarget]} hitCounters={{target:0}} activeTargetId="target" />}
    <div className="training-status"><div><span>{task.type === 'checkout' ? 'CHECKOUT' : 'AUFNAHME'}</span><strong>{currentVisitNumber} / {totalVisits}</strong></div><div><span>PUNKTE</span><strong>{taskState.score} / {getTrainingTaskMaxScore(task)}</strong></div></div>
    {task.type !== 'highscore' && task.type !== 'checkout' && <DartSlots values={slots} emptyText="Noch nicht" />}
    {task.type === 'highscore' ? <ScoreKeypad value={scoreInput} onChange={setScoreInput} onConfirm={() => { apply({result:'score',value:Number(scoreInput)}); setScoreInput('') }} disabled={false} fill /> : task.type === 'checkout' ? <div className="training-checkout-buttons">{checkoutChoices.map((darts) => <button type="button" key={darts} onClick={() => apply({result:'checkout',darts})}>{darts} {darts===1?'DART':'DARTS'}<small>+{task.configuration.scoring[darts] ?? 0}</small></button>)}<button type="button" onClick={() => apply({result:'miss'})}>NICHT GESCHAFFT<small>+0</small></button></div> : <div className="training-hit-buttons">
      {(task.type === 'bull' ? [['bull','OUTER BULL'],['bullseye','BULLSEYE']] : task.configuration.ring === 'double' ? [['double','DOUBLE']] : task.configuration.ring === 'triple' ? [['triple','TRIPLE']] : [['single','SINGLE'],['double','DOUBLE'],['triple','TRIPLE']]).map(([result,label]) => <button type="button" key={result} onClick={() => apply({result})}>{label}<small>+{task.configuration.scoring[result]}</small></button>)}
      <TrainingMissButton onMiss={() => apply({result:'miss'})} onFill={() => apply({result:'miss'},true)} />
    </div>}
  </section>
  {taskResult && <div className="training-task-result"><section><span>AUFGABE GESCHAFFT</span><h2>{taskResult.task.title}</h2><strong>{taskResult.state.score} / {getTrainingTaskMaxScore(taskResult.task)}</strong><b>{getTrainingTaskMaxScore(taskResult.task) ? percent(taskResult.state.score/getTrainingTaskMaxScore(taskResult.task)*100) : 'OHNE WERTUNG'}</b><button type="button" onClick={() => setTaskResult(null)}>NÄCHSTE AUFGABE</button></section></div>}
  </main>
}

export default function Training({ activeProfile, players, onBack }) {
  const normalizedPlayers = useMemo(() => players?.length ? players.map((player,index) => ({...player,id:player.id??index+1,name:player.name?.trim()||`Spieler ${index+1}`})) : [{id:1,name:activeProfile?.name||'Spieler 1',color:'#42e695'}], [activeProfile,players])
  const [view,setView] = useState('home')
  const [tasks,setTasks] = useState([])
  if(view==='builder') return <TrainingBuilder onBack={() => setView('home')} onStart={(plan) => {setTasks(plan);setView('game')}} />
  if(view==='game') return <TrainingGameplay tasks={tasks} players={normalizedPlayers} activeProfile={activeProfile} onExit={onBack} />
  return <main className="training-home"><header className="training-page-header"><button type="button" onClick={onBack} aria-label="Zurück">‹</button><div><span>DARTQUEST</span><h1>Training</h1></div></header><section><div>🎯</div><h2>Stelle dein eigenes Darttraining zusammen.</h2><p>Wähle Übungen aus, passe sie an und erstelle deinen persönlichen Trainingsplan.</p></section><article><span>TRAININGS-BAUKASTEN</span><h2>Angepasstes Training</h2><p>Trainingsaufgaben auswählen, konfigurieren und in deiner Reihenfolge spielen.</p><button type="button" onClick={() => setView('builder')}>TRAINING ERSTELLEN</button></article></main>
}
