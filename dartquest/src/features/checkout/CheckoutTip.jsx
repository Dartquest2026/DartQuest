import { useMemo, useState } from 'react'
import { explainField, getCheckoutAdvice } from './checkoutGuide'
import './CheckoutTip.css'

const STORAGE_KEY = 'dartquest-checkout-tip-visible'

export default function CheckoutTip({ rest, dartsRemaining = 3 }) {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const [alternative, setAlternative] = useState(0)
  const advice = useMemo(() => getCheckoutAdvice(rest, dartsRemaining), [dartsRemaining, rest])
  const route = advice.routes[alternative % Math.max(1, advice.routes.length)]

  function setTipVisible(next) {
    setVisible(next)
    setAlternative(0)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  if (!visible) return <button className="checkout-tip-trigger" type="button" onClick={() => setTipVisible(true)}><span aria-hidden="true">i</span> Checkout-Tipp anzeigen</button>

  return <section className="checkout-tip" aria-live="polite">
    <header><span>CHECKOUT-TIPP</span><strong>{rest}<small> Rest</small></strong></header>
    {route ? <>
      <div className="checkout-tip-route">{route.map((field, index) => <span key={`${field.notation}-${index}`}><b className={`checkout-field checkout-field-${field.multiplier}`}>{field.notation}</b>{index < route.length - 1 && <i>→</i>}</span>)}</div>
      <p>{route.map(explainField).join(' · ')}</p>
    </> : <div className="checkout-setup"><strong>Kein direktes Checkout möglich.</strong><span>Empfohlener Set-up-Wurf:</span><p>{advice.setup?.text || 'Spiele sicher, ohne einen Rest von 1 zu stellen.'}</p></div>}
    <footer>
      {advice.routes.length > 1 && <button type="button" onClick={() => setAlternative((current) => (current + 1) % advice.routes.length)}>Alternative anzeigen</button>}
      <button type="button" onClick={() => setTipVisible(false)}>Tipp ausblenden</button>
    </footer>
  </section>
}
