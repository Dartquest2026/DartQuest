export const TRAINING_INFO=Object.freeze({
  '201':{
    title:'201',
    subtitle:'Dynamisches Double-Out-Training mit steigendem Schwierigkeitsgrad.',
    sections:[
      {title:"SO FUNKTIONIERT'S",paragraphs:[
        'Du startest bei 201 Punkten und spielst wie bei einem normalen X01-Spiel auf exakt 0 herunter. Das Leg muss mit einem Doppel beendet werden.',
        'Vor dem Training legst du fest, wie viele Darts bzw. Aufnahmen du maximal für einen erfolgreichen Abschluss verwenden darfst.',
        'Schaffst du den Checkout innerhalb dieses Limits, steigt dein Startwert beim nächsten Versuch um 10 Punkte: 201 → 211 → 221 → 231 → …',
        'Schaffst du es nicht innerhalb des eingestellten Limits, fällt dein Startwert wieder um 10 Punkte. Beispiel: 231 nicht geschafft → der nächste Versuch startet bei 221. Der niedrigste mögliche Startwert bleibt immer 201.',
      ]},
      {title:'ZIEL',paragraphs:['Sammle die eingestellte Anzahl erfolgreicher Abschlüsse. Jeder innerhalb des Dart-Limits erfolgreich beendete Durchgang zählt als 1 Erfolg. Sobald du dein Erfolgsziel erreicht hast, ist die Übung abgeschlossen.']},
      {title:'EINSTELLUNGEN',bullets:['Dart-/Aufnahmenlimit','Anzahl benötigter Erfolge'],paragraphs:['Während des Trainings werden unter anderem Restscore, verbrauchte Darts und Average angezeigt.']},
    ],
  },
  'bull-finisher':{
    title:'Bull Finisher',
    subtitle:'Bullseye, Checkout-Aufbau und Rettungswurf aus 50 Rest.',
    sections:[
      {title:"SO FUNKTIONIERT'S",paragraphs:['Jede Aufnahme beginnt bei exakt 50 Rest und besteht aus maximal 3 Darts.']},
      {title:'DART 1 – BULLSEYE',paragraphs:['Der erste Dart geht immer auf Bullseye (50).','Triffst du Bullseye direkt mit Dart 1, ist die Aufnahme sofort erfolgreich beendet und du erhältst 3 Punkte.']},
      {title:'WENN DART 1 BULLSEYE NICHT TRIFFT',paragraphs:['Der tatsächlich getroffene Wert wird von 50 abgezogen.','Beispiele: Single Bull (25) ergibt 25 Rest, Single 20 ergibt 30 Rest und Single 18 ergibt 32 Rest.','Ab jetzt besteht die Aufgabe darin, den entstandenen Rest mit den verbleibenden Darts regulär per Double Out zu finishen.']},
      {title:'2 PUNKTE – REGULÄRER CHECKOUT',paragraphs:['Nach Dart 1 versuchst du, den entstandenen Rest mit Dart 2 und gegebenenfalls Dart 3 auszuchecken.','Beispiel 1: S20 mit Dart 1 ergibt 30 Rest. D15 mit Dart 2 beendet den Checkout und bringt 2 Punkte.','Beispiel 2: Single Bull mit Dart 1 ergibt 25 Rest. S9 mit Dart 2 stellt 16 Rest, D8 mit Dart 3 beendet den Checkout und bringt 2 Punkte.','Ein erfolgreicher regulärer Checkout nach dem verfehlten Bullseye-Versuch bringt 2 Punkte.']},
      {title:'WICHTIG – DART 3 GEHT NICHT AUTOMATISCH AUFS BULL',paragraphs:['Solange nach Dart 2 noch ein regulärer Checkout mit einem Dart möglich ist, wird dieser Checkout gespielt.','Beispiel: Nach Dart 2 bleiben 16 Rest. Dart 3 geht auf D8 und nicht auf Bull.']},
      {title:'1 PUNKT – RETTUNGSWURF AUFS BULL',paragraphs:['Der dritte Dart geht nur dann noch einmal auf Bullseye, wenn durch Dart 2 kein regulärer Checkout mit dem letzten Dart mehr möglich ist.','Dart 1 hat Bullseye verfehlt. Dart 2 sollte den Rest finishen oder einen sinnvollen Checkout stellen. Fällt Dart 2 aber so, dass der verbleibende Rest mit Dart 3 nicht mehr regulär ausgecheckt werden kann, erhältst du mit Dart 3 eine letzte Chance auf Bullseye.','Trifft Dart 3 Bullseye, erhältst du 1 Punkt. Verfehlt Dart 3 Bullseye, erhältst du 0 Punkte. Der Bull-Wurf ist hier ein Rettungswurf, nachdem der normale Checkoutweg nicht mehr möglich ist.']},
      {title:'0 PUNKTE',paragraphs:['0 Punkte gibt es, wenn Bullseye mit Dart 1 nicht getroffen wurde, anschließend kein regulärer Checkout gelingt und auch der mögliche Rettungswurf auf Bullseye mit Dart 3 nicht getroffen wird.','Danach beginnt eine neue Aufnahme wieder bei 50 Rest.']},
      {title:'PUNKTEÜBERSICHT',bullets:['3 Punkte: Bullseye direkt mit Dart 1.','2 Punkte: Nach verfehltem Bullseye den entstandenen Rest mit Dart 2 oder Dart 3 regulär per Double Out auschecken.','1 Punkt: Der reguläre Checkoutweg ist nach Dart 2 nicht mehr möglich und Dart 3 trifft als Rettungswurf Bullseye.','0 Punkte: Keine der Bedingungen ist erfüllt.']},
      {title:'ZIEL',paragraphs:['Sammle insgesamt 20 Punkte. Bei 20 Punkten ist Bull Finisher abgeschlossen. Das Ziel von 20 Punkten ist fest und nicht konfigurierbar.']},
    ],
  },
  'random-checkouts':{
    title:'Random Checkouts',
    subtitle:'Trainiere zufällig ausgewählte Checkouts in deinem eigenen Bereich.',
    sections:[
      {title:"SO FUNKTIONIERT'S",paragraphs:['Du bestimmst zunächst den Zahlenbereich, den du trainieren möchtest, zum Beispiel 2 bis 60. DartQuest wählt anschließend zufällig einen erreichbaren Checkout aus diesem Bereich.','Deine Aufgabe ist es, diese Zahl nach den normalen Double-Out-Regeln auszuchecken. Nach dem Versuch gibst du an, wie viele Darts du benötigt hast beziehungsweise ob du ihn nicht geschafft hast. Danach erzeugt DartQuest automatisch die nächste Aufgabe.']},
      {title:'ZIEL',paragraphs:['Du kannst eine bestimmte Anzahl von Checkout-Aufgaben absolvieren oder für eine bestimmte Zeit trainieren. Bei einem Zeittraining läuft während des Spiels ein sichtbarer Countdown.']},
      {title:'EINSTELLUNGEN',bullets:['Checkout-Bereich von / bis','Maximale Aufnahmen pro Checkout','Training nach Anzahl oder Zeit','Gewünschte Anzahl der Aufgaben oder Trainingsdauer'],paragraphs:['Die Standardvariante verwendet eine Aufnahme, also maximal drei Darts pro Checkout.']},
      {title:'STATISTIK',paragraphs:['DartQuest erfasst deine Checkout-Versuche. So wird später sichtbar, welche Zahlen dir besonders gut liegen und bei welchen du häufiger Schwierigkeiten hast.']},
    ],
  },
})

export const getTrainingInfo=templateId=>TRAINING_INFO[templateId]??null
