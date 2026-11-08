import { hasVisits, visitStatistics } from './trainingVisits'
import { aroundVariant, isAroundClock, isSeriesGame, pointsLabel } from './customTrainingRules'
export default function TrainingScoreboard({run,current}) {
 const around=isAroundClock(run.game),stats=visitStatistics(run)
 return <div className="custom-live"><strong>{around?`${run.misses} Fehlwürfe`:pointsLabel(current.points)}</strong>{hasVisits(run)&&!around&&<span className="training-visit-count" role="status">bei {stats?.total??0} {stats?.total===1?'Aufnahme':'Aufnahmen'}</span>}{around&&<b>{aroundVariant(run.includeBull)}</b>}{run.game==='favorite-double'&&<b>D{run.favoriteDouble??16} · {(run.favoriteDouble??16)*2} Punkte je Treffer</b>}{!hasVisits(run)&&isSeriesGame(run.game)&&<span>Längste Serie: {current.longest}</span>}</div>
}
