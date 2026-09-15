# Manuelle Kamera-Kalibrierung

## Umsetzung

Die bestehende Kamera-Testansicht verwendet getUserMedia mit bevorzugter Rückkamera,
autoPlay, playsInline und muted. Hardware-Zoom wird weiterhin über Track-Constraints
angesteuert, sofern das Gerät diese Fähigkeit meldet. Die Ansicht nutzt den freien
Platz; bei aktiver Kamera wird die Aufnahmehistorie ausgeblendet.

CameraPreview importiert und startet keine automatische Board-, Ring-, Bewegungs-
oder Dart-Erkennung mehr. Die alten Utilities und das Calibration Lab bleiben als
inaktive Bestandsdateien erhalten. Der Zeichenloop liest nur die gespeicherte
Homographie und die aktuelle Anzeigegröße; Videopixel werden nicht analysiert.

## Koordinaten und Perspektive

Vier Punkte: Mitte der Segmente 20, 6, 3, 11 an der **äußeren Kante** des Double-Rings
(170 mm vom Zentrum). Die Mitte der farbigen Double-Fläche wäre eine andere Referenz.

Pointer-Clientkoordinaten werden mittels getBoundingClientRect in lokale CSS-Pixel
umgerechnet. Die zentrale Video-Display-Transformation berücksichtigt Videomaße,
Anzeigegröße und zentriertes contain/cover einschließlich Balken bzw. Crop. Die
Ansicht verwendet contain. Canvas-Gerätepixel werden separat über devicePixelRatio
skaliert. Hardware-Zoom verändert bereits das gelieferte Bild und wird nicht noch
beim Zeichnen multipliziert.

manualBoardCalibration normalisiert die Eingabekoordinaten vor dem vorhandenen
linearen Homographie-Solver. Vier Punktpaare bestimmen acht projektive Parameter.
Gespeichert werden Video-zu-Board-Homographie und ihre Inverse. Validierung verwirft
ungültige, gekreuzte, doppelte und nahezu kollineare Punkte sowie eine projektive
Singularität innerhalb des Boards. Die Mathematik liegt außerhalb der React-UI.

Das zentrale Boardmodell enthält die 20 Standardsektoren, sechs radial definierte
Bereiche und Radien 6,35 / 15,9 / 99 / 107 / 162 / 170 mm. Sechs Kreislinien werden
als dicht abgetastete projektive Kurven und 20 Segmentgrenzen als Linien projiziert.
Bull und Mittelpunkt sind immer sichtbar; Debug ergänzt Referenzpunkte, Nummern
und eine kleine Statuszeile. Die Geometrie wird nicht aus Farben abgeleitet.

## Ablauf und Speicherung

BOARD KALIBRIEREN → vier Taps mit sofortigen Markierungen → Vorschau →
KALIBRIERUNG ÜBERNEHMEN. ZURÜCK funktioniert auch nach Punkt vier.
NEU KALIBRIEREN beginnt erneut. Ungültige Punkte können korrigiert werden.

localStorage-Schlüssel: dartquest-manual-board-v1. Enthält Version, vier Videopunkte,
Videomaße, Kamera-ID, facingMode, Zoom, resizeMode, Orientierung, Displaytransformation
mit object-fit und beide Matrizen. Speicherung erfolgt nur beim Übernehmen.
Speicherfehler verhindern die aktuelle Kalibrierung nicht.

Bei Wiederöffnung werden ID, Maße, Zoom, Crop-Modus und Orientierung verglichen.
Ohne Kamera-ID wird keine gespeicherte Kalibrierung automatisch geladen. Validierte
Punkte erzeugen die Matrix erneut; gespeicherte Matrizen werden nicht blind übernommen.
Eine kompatible Kalibrierung erscheint zunächst zur visuellen Kontrolle als Vorschau.
Eine physische Kamerabewegung ist ohne Bildanalyse nicht feststellbar.

Zoom, Videoauflösungswechsel und Gerätedrehung verwerfen das aktive Overlay und
verlangen Neukalibrierung. Reines Layout-Resize ändert nur die Displaytransformation.

## Durchgeführte Prüfungen

- 7 neue Node-Tests: vollständige Boardprojektion frontal / von links / von oben,
  ungültige Eingaben und Speicherwerte, Speicher-Roundtrip und Kompatibilität,
  contain/cover, CSS-Skalierung, Hoch-/Querformatmaße, Balken, Modell und deaktivierte
  automatische Analyse. Perspektiven sind synthetisch, keine Kameraaufnahmen.
- 60 bestehende campaign-modes-Tests erfolgreich; Erwartung für den aktiven
  Kalibrierungsaufruf auf den manuellen Ablauf aktualisiert.
- ESLint für alle vier geänderten/neuen JavaScript-Kameramodule erfolgreich.
- Produktionsbuild erfolgreich (Vite meldet einen Bundle-Größenhinweis).
- git diff --check erfolgreich.

## Noch ausstehender iPhone-/Board-Test

Keine praktische Browser-, Kamera- oder iPhone/Safari-Verifikation in dieser Sitzung.

1. Kamera-Test öffnen; Kamera freigeben. Alle vier Referenzstellen müssen sichtbar sein.
2. Frontal kalibrieren. Jeden Tap visuell mit seiner Markierung vergleichen. ZURÜCK
   ausprobieren. Nach Punkt vier Bull, beide Triple- und Double-Kanten sowie
   Segmentgrenzen prüfen; erst dann übernehmen.
3. Kamera und Board 30 Sekunden stillhalten: Overlay darf nicht wandern oder flackern.
4. Mit Perspektive leicht von links und leicht von oben jeweils neu kalibrieren.
5. Zoom ändern: aktives Overlay muss verschwinden und Neukalibrierung verlangen.
6. Kamera schließen/öffnen: kompatible Daten als Vorschau laden; Übernehmen prüfen.
7. Gerät drehen: Neukalibrierung verlangen. Safari-Leisten/Viewport verändern:
   Bei gleichen Videomaßen müssen Punkte und Overlay weiterhin deckungsgleich sein.
8. Debug ein-/ausschalten: Board bleibt sichtbar, Punkte und Nummern werden ergänzt.
9. Falls möglich Speicherzugriff blockieren und Kameraberechtigung ablehnen:
   verständliche Meldung und erneuter Kamerastart bzw. Sitzungskalibrierung prüfen.

Grenzen: Hardware-Zoom nur bei gemeldeter Unterstützung; blockierter lokaler Speicher
verhindert Persistenz. Objektivverzeichnung und dynamische Stabilisierung/Crops ohne
Änderung der gemeldeten Track-Geometrie lassen sich mit vier Punkten nicht korrigieren.
Ungenaue Taps führen zu ungenauer Projektion, daher Vorschau am echten Board prüfen.
Weitere Dart-/Treffererkennung ist nicht Teil dieses Schritts.
