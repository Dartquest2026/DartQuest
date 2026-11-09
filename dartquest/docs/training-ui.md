# Gemeinsame Bedienung der Trainingsspiele

Alle angepassten Trainings verwenden TrainingScoreboard und TrainingVisitActions.

- Punktzahl oben, direkt darunter die tatsächlich abgeschlossenen Aufnahmen in gut lesbarer Schrift.
- Keine Statuszeilen wie „Nächste Aufnahme bereit“ oder technische Hinweise zur automatischen Erkennung im laufenden Spiel.
- Rückgängig links, kleiner und dezent; die Aufnahme ohne Treffer rechts, mit großer Touchfläche (72 Pixel Höhe).
- Bei Bulls entspricht die rechte Taste der Größe der Plus-Tasten; ausreichend Abstand bleibt zwischen Treffer- und Fehlversuchstasten.
- Der Fünf-Sekunden-Schutz nach einer Aufnahme ohne Treffer gilt gemeinsam; Rückgängig bleibt erreichbar. Pause hält auch diese Zeit an.
- Rundendaten werden nur angezeigt, wenn sie tatsächlich erfasst sind. Around the Clock zählt während des Spiels Fehlwürfe; die aus allen Pfeilen berechnete Aufnahmebilanz erscheint nach Abschluss.
- Alte Ergebnisse und ihre fehlenden Aufnahmezahlen werden nicht nachträglich geschätzt.
- Jede Änderung dieser Anordnung erfolgt an den gemeinsamen Komponenten und wird bei allen angepassten Spielen auf kleinen Handyansichten geprüft.

Bei Favoriten-Doppel sperrt „Einmal getroffen“ die Eingabe ebenfalls fünf Sekunden. Combos werden automatisch in Aufnahmen aufgeteilt: je drei Treffer eine volle Aufnahme; ein anschließender Fehlwurf beginnt nur dann eine zusätzliche Aufnahme, wenn die Trefferzahl durch drei teilbar ist. Es gibt dafür keinen manuellen Fehlwurf-Haken.

Favoriten-Doppel: Jeder Tipp auf „Combo +1“ startet die Fünf-Sekunden-Frist neu. Ein abnehmender Leuchtrahmen an dieser Taste zeigt die Frist. Nach Ablauf wird die Combo einmalig gespeichert. Pause friert Frist und Rahmen ein. Es gibt keine OK-, Minus- oder separate Verwerfen-Taste für Combos; die gemeinsame Rückgängig-Taste korrigiert einzelne Eingaben oder bereits gespeicherte Combos.

Der Combo-Leuchtrahmen muss nach jedem Tipp sofort vollständig geschlossen sein und anschließend über fünf Sekunden einmal komplett ablaufen. Kein animiertes Auffüllen eines teilweise abgelaufenen Rahmens; die Kontur richtet sich nach der tatsächlichen Tastengröße.

Statistikfarben: „Aufnahmen insgesamt“ ist in jedem Hauptdiagramm, Zusatzdiagramm und Freundesvergleich ausschließlich Pastell-Gold (#edc389). Balken, Zahlen und Legende verwenden dieselbe zentrale Farbvorgabe. Die dritte Doppelweg-Position verwendet Violett, damit Gold nicht zugleich eine andere Bedeutung erhält.

## Fokuswechsel

- Eintrag im angepassten Trainingsplan, Zweier-/Dreier-Folge separat auswählbar. Dauer 5/10/15 Minuten, Standard 15; explizit Starten drücken.
- Feste, mathematisch geprüfte Wege aus Daniels „Dart checkout.xlsx“ (61–100), ergänzt um Single-Doppel-Wege für 41–60. Keine beliebige Feldkombination, keine niedrigen Triple-Felder. Auswahl zuerst nach Rest, dann nach passendem Weg; keine direkte Wiederholung derselben Folge.
- Große Zielfelder in Reihenfolge, Rest immer sichtbar. Maximal drei Pfeile. Ergebnis-Buttons 0/1/(2)/Combo geschafft. Jede Aufgabe zählt als eine Aufnahme; nach Eingabe sofort eine neue Aufgabe, ohne Fünf-Sekunden-Sperre.
- Gemeinsame Pause, Alarmtöne, Fortsetzen, Rückgängig und eine letzte Aufnahme nach Zeitablauf. Rückgängig stellt Ziel und Ergebnis wieder her.
- Statistik trennt beide Varianten und Zeitdauern: geschaffte Combos, Erfolgsquote und goldener Aufnahmenbalken; Details zeigen sämtliche Teilergebnisse und gespielte Zielfolgen. Freundesvergleich verwendet dieselbe Variante. Reset umfasst das gesamte Spiel.
- Kontoergebnisse werden online gespeichert, freies Training bleibt im separaten Geräteverlauf. Keine XP/Coins.

### Leichte Single-Runden in Fokuswechsel

- Zufällig etwa 20 % der Aufgaben: Zweier- bzw. Dreier-Folgen mit unterschiedlichen Single-Feldern von 10 bis 20. Keine zwei Single-Runden direkt hintereinander.
- Deutlich als „Single-Runde“ gekennzeichnet; statt „Rest“ steht „Alle Ziele als Single treffen“. Bei normalen Aufgaben ist die Restzahl größer (28 px, auf kleinen Displays 26 px).
- Gleiche Ergebnistasten, sofortiger Wechsel, Undo und Aufnahmezählung. Aufgabenart bleibt in lokaler und Online-Historie gespeichert und in den Aufgabendetails sichtbar; bestehende Ergebnisse bleiben unverändert.

## Eigenständiges Metronom

- Eigener Button im angepassten Trainingsplan, außerhalb der Spiele und ihrer Statistik. Eine gespeicherte Konfiguration pro Konto/Gast bzw. freiem Board, lokal auf dem Gerät.
- 1–100 frei beschriftbare Abschnitte; Plus, Entfernen, Duplizieren und Sortieren. Pro Abschnitt Abstand in Sekunden (0,1–600) oder BPM (1–300), 1–100 Töne und Klick/Holz/Glocke mit Hörprobe.
- Erster Ton bei null; jeder weitere Abstand zählt vom vorherigen Ton. BPM bedeutet 60/BPM Sekunden. Eine Schleife enthält einen einstellbaren Abstand vom letzten Ton zum nächsten Rundenbeginn.
- Automatische Speicherung, bearbeitbare Drei-Pfeile-Vorlage mit Rückholen der Pfeile. Start, Pause/Fortsetzen, Stopp/Anfang. Bearbeiten oder Verlassen stoppt den Ton vollständig.
- Web-Audio-Uhr mit kurzem Planungsvorlauf; Pause verwirft vorgeplante Töne, Fortsetzen erhält den verbleibenden Abstand. Nach einer Hintergrund-Unterbrechung werden überfällige Töne übersprungen, nicht als Tonserie nachgeholt.
- Ablaufdaten und Wiedergabe werden auch vom Metronom-Button innerhalb ausgewählter Trainings verwendet.

### Lautstärke je Metronom-Abschnitt

- Jeder Abschnitt hat einen Regler von 0 bis 100 Prozent und eine Hörprobe mit der eingestellten Lautstärke. 0 Prozent bleibt als stiller Zeitabschnitt im Ablauf erhalten.
- Die Lautstärke gilt für alle Töne dieses Abschnitts. Für lauter/leiser wechselnde Einzeltöne mehrere Abschnitte mit jeweils einem Ton anlegen.
- Bestehende Abläufe übernehmen 75 Prozent; das entspricht der vorherigen Tonlautstärke. Lautstärke wird beim Speichern, Duplizieren, Sortieren und Abspielen übernommen.

### Standardvorlage für eine vollständige Aufnahme

Der Vorlagenbutton heißt „Standardvorlage“. 38 editierbare Abschnitte: Vorbereitung hinter der Oche, zur Linie gehen, Füße ausrichten, Blick heben, fokussieren und atmen; dann für jeden der drei Pfeile Greifen, Griff prüfen, Fokussieren, Arm heben, Rückbewegung, Abwurf mit Nachführen, Arm senken und Atmen; anschließend Treffer ansehen, zum Board gehen, Pfeile ziehen, zurückgehen, hinter der Oche aufstellen, lockern, atmen und für die nächste Runde bereitstehen.

Die Bewegungsreihenfolge orientiert sich an Winmaus Analyse https://winmau.com/blogs/news/world-s-smoothest-v-world-s-most-modern und der Wurfanleitung von Phoenix Darts https://web02.phoenixdart.com/au/help/guide_view?guidecode_1=100222&guidecode_2=100233. Zeiten, Töne und Lautstärken sind eigene, frei anpassbare Vorschläge. Die Vorlage wird ausschließlich per Button geladen; bereits gespeicherte eigene Abläufe werden beim App-Update nicht ersetzt.


### Drei Metronom-Speicherplätze und Wiedergabe im Spiel

- Drei benannte Speicherplätze pro Konto/Gast bzw. freiem Board auf dem jeweiligen Gerät. Der automatisch gesicherte Editorentwurf bleibt separat. Laden und bewusstes Speichern/Überschreiben erfolgen über die drei Karten. Ein bisheriger Einzelablauf wird einmalig in Platz 1 übernommen.
- Bulls Warm-Up, Around the Clock, Fokuswechsel und Doppelweg haben einen mindestens 44 px hohen Metronom-Button unten im Spiel. Auswahl eines gespeicherten Ablaufs startet ihn sofort; erneutes Antippen stoppt und gibt sämtliche Tonquellen frei. Im Spiel läuft der gewählte Ablauf immer als Schleife bis zum Stopp.
- Spielpause, Verlassen-Dialog, Wechsel zur Statistik und Zeitablauf stoppen das Metronom. Nach Fortsetzen muss es bewusst erneut ausgewählt werden. Metronom verändert weder die Aufnahmezählung noch den Spieltimer.
