export const TRAINING_TEMPLATES=Object.freeze([
 {id:'201',type:'201',category:'FESTE SPIELE',title:'201',description:'Dynamisches Double-Out mit steigendem Startwert.',defaults:{dartLimit:12,successGoal:5}},
 {id:'bull-finisher',type:'bullFinisher',category:'FESTE SPIELE',title:'Bull Finisher',description:'Bullseye und Finish-Aufbau ab 50 Rest.',defaults:{}},
 {id:'random-checkouts',type:'randomCheckout',category:'FESTE SPIELE',title:'Random Checkouts',description:'Zufällige, erreichbare Checkouts nach Zeit oder Anzahl.',defaults:{from:2,to:60,maxVisits:1,goalType:'time',minutes:10,targetCheckoutCount:20}},
])
export function createTrainingTask(templateId,overrides={}){const template=TRAINING_TEMPLATES.find(item=>item.id===templateId);if(!template)throw new Error(`Unbekanntes Training: ${templateId}`);return{...template,configuration:{...template.defaults,...(overrides.configuration??{})}}}
export function moveTrainingTask(tasks,index,direction){const target=index+direction;if(target<0||target>=tasks.length)return tasks;const copy=[...tasks];[copy[index],copy[target]]=[copy[target],copy[index]];return copy}
export function updateTrainingTaskAt(tasks,index,task){return tasks.map((item,itemIndex)=>itemIndex===index?task:item)}
export const describeTrainingTask=task=>task.type==='201'?`${task.configuration.dartLimit} Darts · ${task.configuration.successGoal} Erfolge`:task.type==='bullFinisher'?'20 Punkte':`${task.configuration.from}–${task.configuration.to} · ${task.configuration.maxVisits} Aufnahme${task.configuration.maxVisits>1?'n':''} · ${task.configuration.goalType==='checkoutCount'?`${task.configuration.targetCheckoutCount} Aufgaben`:`${task.configuration.minutes} Min.`}`
