export const CURRENT_RELEASE = import.meta.env?.VITE_APP_VERSION ?? globalThis.process?.env?.npm_package_version
export const RELEASE_DATE = '2026-08-16'

export const RELEASE_FEATURES = Object.freeze([
  { id: 'version-display', version: CURRENT_RELEASE, title: 'App-Version sichtbar', description: 'Die installierte DartQuest-Version ist auf Home und in den Einstellungen sichtbar.', area: 'home', seen: 'visible' },
  { id: 'settings-home-entry', version: CURRENT_RELEASE, title: 'Einstellungen auf Home', description: 'Einstellungen sind direkt über einen eigenen Home-Bereich erreichbar.', area: 'home', seen: 'open' },
  { id: 'campaign-transfer', version: CURRENT_RELEASE, title: 'Spielstand übertragen', description: 'Lokaler Kampagnenfortschritt kann sicher auf ein anderes Gerät übertragen werden.', area: 'settings', seen: 'open' },
  { id: 'password-recovery', version: CURRENT_RELEASE, title: 'Passwort zurücksetzen', description: 'Ein vergessener Zugang kann über den vorhandenen E-Mail-Reset wiederhergestellt werden.', area: 'auth-settings', seen: 'open' },
  { id: 'settings-controls', version: CURRENT_RELEASE, title: 'Sound, Animation und Vibration', description: 'Darstellung und Rückmeldungen lassen sich zentral anpassen.', area: 'settings', seen: 'open' },
  { id: 'tutorial-reset', version: CURRENT_RELEASE, title: 'Hinweise erneut starten', description: 'Bedienhinweise können ohne Verlust des Fortschritts zurückgesetzt werden.', area: 'settings', seen: 'open' },
  { id: 'help-contact', version: CURRENT_RELEASE, title: 'Hilfe & Kontakt', description: 'FAQ, Fehlerhilfe und ein sicher vorbereitetes Kontaktformular stehen bereit.', area: 'settings', seen: 'open' },
  { id: 'campaign-burger-menu', version: CURRENT_RELEASE, title: 'Kampagnen-Pausenmenü', description: 'Laufende Kampagnenversuche können pausiert, neu gestartet oder verlassen werden.', area: 'campaign', seen: 'open' },
  { id: 'boss-intro', version: CURRENT_RELEASE, title: 'Boss-Startinszenierung', description: 'Boss-Level beginnen mit einer eigenen, überspringbaren Vorstellung.', area: 'campaign', seen: 'played' },
  { id: 'boss-victory', version: CURRENT_RELEASE, title: 'Boss-besiegt-Sequenz', description: 'Bestätigte Boss-Siege erhalten eine eigene Abschlussdarstellung.', area: 'campaign', seen: 'played' },
  { id: 'boss-variants', version: CURRENT_RELEASE, title: 'Individuelle Boss-Animationen', description: 'Die Welten besitzen unterscheidbare Boss-Stile und Effekte.', area: 'campaign', seen: 'played' },
  { id: 'automatic-world-switch', version: CURRENT_RELEASE, title: 'Automatischer Weltwechsel', description: 'Nach dem ersten Boss-Sieg öffnet sich kontrolliert die neue Welt.', area: 'campaign', seen: 'played' },
  { id: 'coin-return-animation', version: CURRENT_RELEASE, title: 'Animierte Coin-Gutschrift', description: 'Bestätigte Coins werden nach der Rückkehr sichtbar zum Gesamtstand addiert.', area: 'campaign', seen: 'played' },
  { id: 'game-map-crossfade', version: CURRENT_RELEASE, title: 'Weicher Kartenübergang', description: 'Gameplay und Kampagnenkarte wechseln mit einem zugänglichen Crossfade.', area: 'campaign', seen: 'played' },
  { id: 'standard-games', version: CURRENT_RELEASE, title: '501 vollständig spielbar', description: '501 Double Out ist solo und mit bis zu vier Spielern vollständig spielbar.', area: 'standard-games', seen: 'open' },
])
