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
