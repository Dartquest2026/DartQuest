export const TRAINING_RULES = {
  catch40:'Jede Zahl hat einen Versuch. Bis 2 Darts bringen 3 Punkte, 3 Darts bringen 2, danach gibt es 1 Punkt. Ausnahme: 99 in 3 Darts bringt 3 Punkte. Ein Fehlschlag zählt 0.',
  checkoutRange:'Nach einem Finish steigt das Ziel um 1. Ohne Finish wiederholst du dieselbe Zahl mit vollem Dartbudget.',
  randomCheckout:'Es werden nur im gewählten Modus erreichbare Zahlen gezogen. Direkte Wiederholungen werden vermieden, sofern der Bereich weitere Ziele enthält. Das Training endet nach der gewählten Anzahl erfolgreicher Checkouts.',
  nineDarts:'Ein Finish erhöht das Ziel um 1. Alle 5 Zahlen ab der Startzahl wird die Basis gesichert. Ein Finish in höchstens 3 Darts sichert sofort die nächste Zahl. Bei Fehlschlag gilt der Rückfallmodus; unter die gesicherte Basis geht es nie.',
  bobs27:'Jeder Treffer auf das aktuelle Doppel addiert dessen Wert. Bleibt der ganze Doppelblock ohne Treffer, wird der Doppelwert einmal abgezogen. Ende nach dem letzten Doppel oder bei 0 Punkten und darunter.',
  jdc:'Teil 1: je 3 Darts auf 10–15. Teil 2: je 1 Dart auf D1–D20 und Double Bull, je Treffer 50 Punkte. Teil 3: je 3 Darts auf 15–20. In den Shanghai-Teilen zählen Treffer auf die Zielzahl zum Dartwert; Single, Double und Triple in einem Block bringen zusätzlich 100 Punkte.',
}
const number=(key,label,min,max)=>({key,label,min,max})
const choice=(key,label,options)=>({key,label,options})
const out=choice('outMode','Out-Modus',[['straight','Straight Out'],['double','Double Out'],['master','Master Out']])
const bounds=[number('start','Startzahl / Min',2,170),number('end','Endzahl / Max',2,170)]
export function trainingConfigFields(task) {
  const specific={
    checkoutRange:[...bounds,number('maxDarts','Darts pro Checkout',3,15),out],
    catch40:[...bounds,number('maxDarts','Maximale Darts',3,15),out],
    randomCheckout:[...bounds,number('count','Erfolgreiche Checkouts',1,100),number('maxDarts','Maximale Darts',3,15),out,choice('repeatUntilSuccess','Wiederholen bis geschafft',[[true,'An'],[false,'Aus']])],
    nineDarts:[number('start','Erste Basiszahl',2,170),number('end','Endzahl',2,170),number('maxDarts','Maximale Darts',3,15),out,choice('failureMode','Bei Fehlschlag',[['base','Zur Basis'],['previous','Vorherige Zahl']])],
    bobs27:[number('startScore','Startscore',1,1000),number('startDouble','Startdoppel',1,20),number('endDouble','Enddoppel',1,20),number('dartsPerDouble','Darts pro Doppel',1,6)],
    jdc:[],
  }
  if(specific[task.type]) return specific[task.type]
  if(task.type==='sequence'&&task.configuration.hitsPerTarget!=null) return [
    {...number('hitsPerTarget','Treffer pro Feld',1,20),presets:[1,2,3]},
    choice('order','Reihenfolge',[['ascending','1 → 20'],['descending','20 → 1'],['board','Uhrzeigersinn'],['random','Zufällig']]),
    choice('ring','Ringmodus',[['segment','Gesamtes Feld'],['single','Single'],['double','Double'],['triple','Triple']]),
    choice('includeBull','Bull am Ende',[[false,'Aus'],[true,'An']]),
  ]
  return [number('target','Zielsegment',1,20),number('rounds','Aufnahmen',1,50),number('repeatRounds','Wiederholungen',1,30),number('totalDarts','Darts insgesamt',1,180),number('dartsPerRound','Darts pro Aufnahme',1,6)].filter(f=>f.key in task.configuration)
}
