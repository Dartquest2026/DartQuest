import './CampaignModes.css'

const modes = [
  ['standard', '🗺️', 'Standard-Kampagne', 'Die bisherige DartQuest-Reise mit fünf Schwierigkeitsstufen.'],
  ['checkout', '🎯', 'Checkout-Kampagne', '169 Checkouts – von 2 bis 170.'],
  ['rival', '🤖', 'Rivalen-Kampagne', 'First to 3 gegen immer stärkere KI-Gegner.'],
  ['timeChallenge', '⏱️', 'Time Challenge', 'Wiederholbare Übungen gegen deine eigene Bestzeit.'],
  ['cameraTest', '📷', 'Testversion Kamera', 'Kamera-Prototyp auf Basis der Rivalen-Kampagne.'],
]

export default function CampaignModes({ onBack, onSelect }) {
  return <main className="campaign-modes"><header><button type="button" onClick={onBack} aria-label="Zurück">‹</button><div><span>DARTQUEST</span><h1>Spielmodi</h1></div></header>
    <section className="campaign-modes__intro"><h2>Welche Kampagne möchtest du spielen?</h2><p>Jeder Modus speichert seinen Fortschritt separat.</p></section>
    <section className="campaign-modes__grid">{modes.map(([id, icon, title, description]) => <button type="button" key={id} onClick={() => onSelect(id)}><i>{icon}</i><span><strong>{title}</strong><small>{description}</small></span><b>›</b></button>)}</section>
  </main>
}
