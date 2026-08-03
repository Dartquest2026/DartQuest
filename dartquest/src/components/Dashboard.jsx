function Dashboard({ onStartCampaign }) {
  return (
    <section className="page">
      <div className="welcome-card">
        <p>Willkommen zurück, Daniel 👋</p>

        <h2>Bereit für dein nächstes Training?</h2>

        <div className="progress-info">
          <span>Kampagnenfortschritt</span>
          <strong>1 von 100</strong>
        </div>

        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={onStartCampaign}
        >
          Weiter spielen
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">⭐</span>
          <strong>0</strong>
          <p>Sterne</p>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🔥</span>
          <strong>0</strong>
          <p>Tagesserie</p>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🏆</span>
          <strong>0</strong>
          <p>Erfolge</p>
        </article>
      </div>

      <section className="daily-card">
        <div>
          <p className="eyebrow">TAGESAUFGABE</p>
          <h3>Treffe dreimal die Single 20</h3>
          <p>Du hast maximal 9 Pfeile.</p>
        </div>

        <button className="secondary-button" type="button">
          Starten
        </button>
      </section>
    </section>
  )
}

export default Dashboard