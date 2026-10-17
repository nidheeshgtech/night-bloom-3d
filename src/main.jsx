import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { applyBrand } from './brand'
import App from './App'
import { useGarden } from './lib/store'
import { rig, player } from './lib/player'
import './styles.css'

// Debug handle for local testing only.
if (import.meta.env.DEV) window.__garden = { useGarden, rig, player, gsap }

applyBrand()

createRoot(document.getElementById('root')).render(<App />)
