import {useEffect} from 'react'
import {getTrainingInfo} from './trainingInfo'

export default function TrainingInfoModal({templateId,onClose}){
  const info=getTrainingInfo(templateId)
  useEffect(()=>{if(!info)return;const close=event=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[info,onClose])
  if(!info)return null
  return <div className="training-info-backdrop" onClick={onClose}>
    <section className="training-info-modal" role="dialog" aria-modal="true" aria-labelledby="training-info-title" onClick={event=>event.stopPropagation()}>
      <header><div><span>ÜBUNGSINFO</span><h2 id="training-info-title">{info.title}</h2></div><button type="button" onClick={onClose} aria-label="Info schließen">×</button></header>
      <p className="training-info-subtitle">{info.subtitle}</p>
      <div className="training-info-content">{info.sections.map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs?.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{section.bullets&&<ul>{section.bullets.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}</div>
      <button className="training-info-confirm" type="button" onClick={onClose}>VERSTANDEN</button>
    </section>
  </div>
}
