import {hasVisits,isPaused,isVisitLocked} from './trainingVisits'
import {isAroundClock,favoritePendingCount} from './customTrainingRules'
export default function TrainingVisitActions({run,now,onEmpty,onUndo}) {
 if(!hasVisits(run)||run.phase==='saving')return null
 const final=['bulls-final','final-entry'].includes(run.phase)
 const disabled=isVisitLocked(run,now)||Boolean(run.pendingVisit)||Boolean(run.score)||run.choosing||Boolean(favoritePendingCount(run))||(final&&run.visits.length>run.finalVisitBase)
 return <div className="training-visit-actions" inert={isPaused(run)}><button className="training-visit-undo" disabled={!run.visitUndo?.length} onClick={onUndo}>RÜCKGÄNGIG</button>{!isAroundClock(run.game)&&<button className="training-visit-empty" disabled={disabled} onClick={onEmpty}>{run.game==='triple-20-19-18-combo'?'AUFNAHME OHNE ERGEBNIS':'KEIN TREFFER'}</button>}</div>
}
