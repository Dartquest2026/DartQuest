import { createRoot } from 'react-dom/client'
import CameraPreview from '../../src/features/campaignModes/components/CameraPreview.jsx'
import '../../src/features/campaignModes/CampaignModes.css'
import '../../src/features/campaignModes/RivalMobile.css'
import '../../src/features/campaignModes/RivalScoreboardHistory.css'
createRoot(document.getElementById('root')).render(<main className="rival-game camera-test-game"><header><span>KAMERA TEST</span></header><section className="rival-scoreboard"><article>Spieler · 501</article></section><CameraPreview /></main>)
