import { useEffect, useState } from 'react'

import './LevelCompleteAnimation.css'

const MESSAGE_GROUPS = {
  4: ['PERFEKT!', 'UNGLAUBLICH!', 'BÄRENSTARK!', 'WELTKLASSE!', 'SAUBER!', 'ABSOLUT STARK!', 'VOLLTREFFER!', 'MEISTERHAFT!', 'BRUTAL GUT!', 'GENAU SO!'],
  3: ['SUPER!', 'STARK!', 'SEHR GUT!', 'SAUBERE RUNDE!', 'WEITER SO!', 'RICHTIG GUT!', 'TOP!', 'KLASSE!', 'FAST PERFEKT!'],
  2: ['GUT GEMACHT!', 'SOLIDE!', 'DRANBLEIBEN!', "WEITER GEHT'S!", 'GUTER WURF!', 'DAS WIRD!', 'STARKER FORTSCHRITT!'],
  1: ['GESCHAFFT!', 'DRANBLEIBEN!', 'WEITER SO!', 'DU PACKST DAS!', 'JEDER TREFFER ZÄHLT!', 'NÄCHSTES MAL NOCH STÄRKER!', 'GUT GEKÄMPFT!', 'WEITER TRAINIEREN!'],
}

const SUBTITLE_GROUPS = {
  4: ["Besser geht's kaum.", 'Das war richtig stark.', 'Perfekte Runde.'],
  3: ['Nur noch ein kleiner Schritt.', 'Das sah gut aus.', 'Eine starke Runde.'],
  2: ['Du wirst sicherer.', 'Weiter trainieren.', 'Der Fortschritt ist sichtbar.'],
  1: ['Geschafft ist geschafft.', 'Der nächste Versuch wird noch besser.', 'Jeder Treffer bringt dich weiter.'],
}

const BOSS_MESSAGES = ['BOSS BESIEGT!', 'BOSS GEKNACKT!', 'STARKER SIEG!', 'WELT GESCHAFFT!']
let lastCompletionMessage = ''

function chooseMessage(messages) {
  const alternatives = messages.filter((message) => message !== lastCompletionMessage)
  const pool = alternatives.length ? alternatives : messages
  const message = pool[Math.floor(Math.random() * pool.length)]
  lastCompletionMessage = message
  return message
}

function LevelCompleteAnimation({ stars, xp, coins, totalDarts, visits, isBoss = false, levelId, autoPerfect = false, onStarReveal, onPerfectReveal, onRewardsReveal }) {
  const earnedStars = Math.max(1, Math.min(4, stars ?? 1))
  const [displayXP, setDisplayXP] = useState(0)
  const [displayCoins, setDisplayCoins] = useState(0)
  const [message] = useState(() => chooseMessage(isBoss ? BOSS_MESSAGES : MESSAGE_GROUPS[earnedStars]))
  const [subtitle] = useState(() => {
    const options = SUBTITLE_GROUPS[earnedStars]
    return options[Math.floor(Math.random() * options.length)]
  })

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers = []
    const rewardStart = reducedMotion ? 80 : 1580
    const rewardSteps = reducedMotion ? 1 : 12
    for (let step = 1; step <= rewardSteps; step += 1) {
      timers.push(window.setTimeout(() => {
        setDisplayXP(Math.round((xp ?? 0) * step / rewardSteps))
        setDisplayCoins(Math.round((coins ?? 0) * step / rewardSteps))
      }, rewardStart + step * (reducedMotion ? 1 : 28)))
    }
    if (onStarReveal) {
      for (let index = 0; index < earnedStars; index += 1) {
        timers.push(window.setTimeout(() => onStarReveal(index + 1), reducedMotion ? 40 : 400 + index * 165))
      }
    }
    if (autoPerfect && onPerfectReveal) timers.push(window.setTimeout(onPerfectReveal, reducedMotion ? 60 : 1180))
    if (onRewardsReveal) timers.push(window.setTimeout(onRewardsReveal, reducedMotion ? 80 : 1580))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [autoPerfect, coins, earnedStars, onPerfectReveal, onRewardsReveal, onStarReveal, xp])

  return (
    <section className={`level-complete-animation stars-${earnedStars}${isBoss ? ' is-boss' : ''}`} aria-live="polite">
      <p className="level-complete-eyebrow">{isBoss ? `BOSS-LEVEL ${levelId}` : `LEVEL ${levelId}`}</p>

      <div className="level-complete-stars" aria-label={`${earnedStars} von 4 Sternen`}>
        {Array.from({ length: earnedStars }, (_, index) => index + 1).map((star) => (
          <span
            key={star}
            className="is-earned"
            style={{
              '--empty-star-delay': `${350 + (star - 1) * 30}ms`,
              '--earned-star-delay': `${400 + (star - 1) * 165}ms`,
            }}
            aria-hidden="true"
          >
            ★
          </span>
        ))}
      </div>

      <div className="level-complete-message">
        <h2>{autoPerfect ? 'PERFEKT!' : message}</h2>
        <p>{autoPerfect ? 'Alle Ziele in der ersten Aufnahme.' : subtitle}</p>
      </div>

      <p className="level-complete-range">
        {totalDarts} {totalDarts === 1 ? 'Pfeil' : 'Pfeile'} · {visits} {visits === 1 ? 'Aufnahme' : 'Aufnahmen'}
      </p>

      <div className="level-complete-rewards">
        <span><strong>+{displayXP}</strong> XP</span>
        <i aria-hidden="true">•</i>
        <span><b aria-hidden="true">🪙</b> <strong>+{displayCoins}</strong> Coins</span>
      </div>

    </section>
  )
}

export default LevelCompleteAnimation
