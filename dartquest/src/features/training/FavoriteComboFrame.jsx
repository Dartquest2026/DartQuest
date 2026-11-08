import {useLayoutEffect,useRef} from 'react'
import {VISIT_IDLE_MS,favoriteComboRemaining} from './trainingVisits'
function ActiveFrame({run,now}) {
 const svg=useRef(null)
 useLayoutEffect(()=>{
  const element=svg.current
  const measure=()=>{
   const width=element.clientWidth,height=element.clientHeight
   if(width<4||height<4)return
   element.setAttribute('viewBox',`0 0 ${width} ${height}`)
   for(const rect of element.querySelectorAll('rect')){
    rect.setAttribute('width',String(width-4));rect.setAttribute('height',String(height-4));rect.setAttribute('rx','16')
   }
  }
  measure()
  const observer=new ResizeObserver(measure);observer.observe(element)
  return()=>observer.disconnect()
 },[run.favoriteComboAt,run.favoriteComboCount])
 const ratio=Math.max(0,Math.min(1,favoriteComboRemaining(run,now)/VISIT_IDLE_MS))
 // Replace the stroke on each tap so refilling never animates backwards.
 const strokeKey=`${run.favoriteComboAt}:${run.favoriteComboCount}`
 return <svg ref={svg} className="favorite-combo-frame" preserveAspectRatio="none" aria-hidden="true"><rect className="favorite-combo-track" x="2" y="2" width="96%" height="96%" rx="16"/><rect key={strokeKey} className="favorite-combo-progress" x="2" y="2" width="96%" height="96%" rx="16" pathLength="100" strokeDasharray="100 100" strokeDashoffset={(1-ratio)*100}/></svg>
}
export default function FavoriteComboFrame({run,now}) {
 return run.favoriteComboAt==null||!run.favoriteComboCount?null:<ActiveFrame run={run} now={now}/>
}
