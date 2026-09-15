# KI DATEN – lokaler Kamera-Datensammler

## Bedienung

In der Kamera-Testversion **KI DATEN · ENTWICKLUNG** öffnen. Kategorie wählen,
AUFNEHMEN antippen, das JPEG in der Vorschau prüfen und SPEICHERN oder VERWERFEN
wählen. NOCHMAL ersetzt die Vorschau. Die Kategorie bleibt für Serienaufnahmen
gewählt. 1/2/3 Darts meint alle tatsächlich im Board steckenden Darts; bei Bewegt
und Sonstiges ist dartCount null (unbekannt). Eine Kalibrierung ist nicht nötig.
Schließen des Bereichs verwirft eine noch nicht gespeicherte Vorschau.

DATENSATZ zeigt Anzahl je Kategorie, Gesamtanzahl und Dateigröße. Die Liste ist in
Seiten zu acht Aufnahmen aufgeteilt. Eintrag antippen, Bild prüfen und bei Bedarf
DIESE AUFNAHME LÖSCHEN wählen. Es gibt keine automatische Aufnahme oder Übertragung.

## Dateien und Architektur

Geändert: CameraPreview.jsx, package.json, package-lock.json, .gitignore.
Neu unter src/features/campaignModes:

- cameraDataset/captureFrame.js: Kategorien, Metadaten, direkte Videoaufnahme.
- cameraDataset/datasetStore.js: austauschbare lokale Repository-Schnittstelle.
- cameraDataset/datasetExport.js: Exportplanung und ZIP-Erzeugung mit fflate.
- components/CameraDatasetPanel.jsx und .css: mobiler Entwicklungsbereich.

Neu: scripts/camera-dataset.test.mjs, scripts/camera-dataset.browser.mjs,
scripts/fixtures/camera-dataset.html und .jsx, dieses Dokument.
Testartefakte unter test-results sind ignoriert.

Die existierende Vierpunktkalibrierung, Homographien, gespeicherten Kalibrierungen,
Boardradien, Sektoren und Debug-Overlay bleiben erhalten. Der Datensammler wird
unabhängig von diesen Modulen geöffnet; nach Schließen sind die bisherigen
Kalibrierungsbuttons wieder erreichbar. Die Rivalenlogik wurde nicht geändert.

## Bild und Metadaten

JPEG mit angeforderter Qualität 0,95. Ein separater Canvas zeichnet ausschließlich
HTMLVideoElement mit videoWidth × videoHeight, ohne Verkleinerung, CSS-Crop, UI oder
Overlay. getUserMedia bevorzugt 1920 × 1080; gespeichert wird immer die tatsächlich
gelieferte Auflösung, nicht die nominelle Sensorauflösung. Bildauswahl und
JPEG-Kodierung laufen ohne Netzwerkzugriff.

Pro Frame: zufällige UUID, ISO-Zeitstempel, Kategorie, angegebene Dartanzahl und
Quelle user_category, Videomaße, dargestellte und lokale Viewportmaße, Fenstermaße,
Pixelratio, object-fit/position, Orientierung, gemeldeter Zoom, facingMode,
resizeMode, Aktivität/Zustand und Snapshot der kompatiblen Kalibrierung,
App-Version aus package.json, Datensatz-Version, eindeutiger Bildpfad, MIME-Typ,
JPEG-Qualität und tatsächliche Dateigröße. Nicht gemeldete Geräteeigenschaften sind
null. Die Kalibrierung ist eine Entwicklungshilfe, kein verifiziertes KI-Label.

## Lokaler Speicher

IndexedDB-Datenbank dartquest-camera-dataset, Version 1. Zwei Object Stores:
metadata (keyPath id) und images (JPEG-Blob unter derselben id). SPEICHERN schreibt
beide atomar; Löschen entfernt beide atomar. Vorschau existiert nur im Arbeitsspeicher.
Die Übersicht lädt Metadaten, keine sämtlichen Bilder. Object-URLs werden freigegeben.
Bei Speicherfehlern bleibt die Vorschau erhalten; es wird kein Erfolg vorgetäuscht.

Der Speicher ist an Browser und Origin gebunden. Andere Domain/Port, Privatmodus,
Browserdaten-Löschung oder Speicherverdrängung können einen anderen oder leeren
Bestand ergeben. Regelmäßiger Export ist nötig. Keine Bilder in localStorage;
keine Cloud-Anbindung. Die Store-Schnittstelle lässt später einen bewusst
angestoßenen Upload ergänzen, ohne Aufnahme und Metadaten an ein Modell zu koppeln.

## Export

EXPORT DATENSATZ erzeugt ein ZIP mit images/frame_<UUID>.jpg und metadata.json.
Jeder Eintrag hat id und imagePath. JPEGs werden unverändert im ZIP abgelegt.
Größere Sammlungen werden anhand der Bildgrößen in ca. 50-MiB-Teile zerlegt;
ein einzelnes größeres Bild bleibt vollständig. Ein Teil wird jeweils aufgebaut.
Jeder Teil enthält seine eigene metadata.json mit exportId, part und totalParts.
Am PC die Bilder zusammenführen und die images-Arrays der einzelnen JSON-Dateien
zusammenführen; die JSON-Dateien beim Entpacken nicht gegenseitig überschreiben.

Nach Vorbereitung ZIP HERUNTERLADEN antippen. Falls navigator.canShare die ZIP-Datei
unterstützt, gibt es zusätzlich ZIP TEILEN / IN DATEIEN SICHERN. Dieser separate
Button erhält die erforderliche Nutzeraktivierung. Teilen wählt der Nutzer selbst;
das Programm übermittelt keine Dateien automatisch. Für weitere Teile den jeweiligen
TEIL-Button wählen und anschließend erneut herunterladen/teilen. Ein erneuter Export
erstellt eine neue Momentaufnahme; gespeicherte Bilder werden dabei nicht gelöscht.

## Safari und Kapazität

IndexedDB ist für binäre Daten geeigneter als localStorage. WebKit-Quoten sind
Obergrenzen, keine garantierte Kapazität; Speicher kann verdrängt werden. Die UI
zeigt navigator.storage.estimate(), falls verfügbar. Siehe
[WebKit Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
Dateifreigabe verlangt Nutzeraktivierung und wird zur Laufzeit geprüft; siehe
[Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API).

Eine feste zuverlässige Bildanzahl gibt es nicht. Rechenbeispiel, keine Messung:
Bei durchschnittlich 1–3 MiB je JPEG benötigen 100 Bilder etwa 100–300 MiB;
1 GiB freier nutzbarer Platz entspräche rechnerisch etwa 340–1.000 Bildern.
Tatsächliche Dateigrößen hängen von Auflösung und Bildinhalt ab. Quota, freier
Gerätespeicher und ZIP-Arbeitsspeicher begrenzen früher; in regelmäßigen Serien
exportieren. Auch 50-MiB-Teile sind keine Garantie für alle älteren iPhones.

## Prüfungen

- 4 neue Node-Tests erfolgreich: Kategorien/fehlende Werte, Videoframe-Aufnahme,
  IndexedDB mit fake-indexeddb (Transaktionen, Duplikate, Wiederöffnung, Löschen),
  Zähler und ZIP-Roundtrip mit eindeutiger Zuordnung und Teilplanung.
- Browser-Integration mit installiertem Chrome, 390 × 844 CSS-Pixeln, Touch und
  simuliertem 1280 × 720-Kamerastream: Start, Aufnahme 0/1/2/3, Vorschau, Verwerfen,
  Speichern, Zähler, Reload, ZIP-Download, Löschen, Speicherfehler und Overflow.
  Ein rotes Overlay wurde absichtlich über grünes Video gelegt; ein Pixeltest
  kontrolliert das rohe grüne JPEG. Mobile Ansicht visuell überprüft.
- 67 Kamera-/Kampagnen-Regressionstests erfolgreich.
- Gesamter Node-Testlauf: 236 Tests, 234 erfolgreich, 2 bestehende Fehler in
  scripts/boss-intro.test.mjs: Erwartung INTRO ÜBERSPRINGEN und
  setLevelEnterTransition im Startblock. Die geprüften Kampagnen-/Intro-Dateien
  und diese Tests wurden nicht geändert.
- ESLint für die geänderten Produktmodule erfolgreich.
- npm run build erfolgreich, bestehender Vite-Hinweis auf große Bundles.

Noch offen: echter iPhone-/Safari-Test mit realem Board, Hardware-Zoom,
Dateien-App/Share Sheet, Speicherknappheit und größeren realen Bildserien.
Chrome mit Touch-Viewport ist kein Ersatz für diesen Hardwaretest.

Befehle: npm run test:camera-dataset; npm run test:camera-dataset-browser
(benötigt lokal installiertes Chrome); npm run build.
Kein Modelltraining, keine automatische Board-/Darterkennung implementiert.
