import './CampaignExitModal.css'

function CampaignExitModal({ onSaveAndExit, onExitWithoutSaving, onCancel }) {
  return (
    <div className="campaign-exit-backdrop" onClick={onCancel}>
      <section
        className="campaign-exit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-exit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="campaign-exit-close" type="button" onClick={onCancel} aria-label="Abbrechen">×</button>
        <div className="campaign-exit-icon">💾</div>
        <h2 id="campaign-exit-title">Kampagne verlassen?</h2>
        <p>Möchtest du deinen aktuellen Fortschritt speichern, bevor du zum Hauptmenü zurückkehrst?</p>
        <button className="campaign-exit-save" type="button" onClick={onSaveAndExit}>💾 SPEICHERN &amp; VERLASSEN</button>
        <button className="campaign-exit-without" type="button" onClick={onExitWithoutSaving}>🚪 OHNE SPEICHERN VERLASSEN</button>
        <button className="campaign-exit-cancel" type="button" onClick={onCancel}>ABBRECHEN</button>
      </section>
    </div>
  )
}

export default CampaignExitModal
