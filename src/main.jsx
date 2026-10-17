import { createRoot } from 'react-dom/client'
import { ROUTE } from './route'
import './styles.css'

const root = createRoot(document.getElementById('root'))

// The showcase page loads without the 3D engine; demos load it on demand.
if (ROUTE.kind === 'showcase') {
  import('./showcase/Showcase').then(({ default: Showcase }) => root.render(<Showcase />))
} else {
  Promise.all([import('./brand'), import('./App'), import('gsap'), import('./lib/store'), import('./lib/player')]).then(
    ([brand, { default: App }, { default: gsap }, { useGarden }, { rig, player }]) => {
      // Debug handle for local testing only.
      if (import.meta.env.DEV) window.__garden = { useGarden, rig, player, gsap }
      brand.applyBrand()
      root.render(<App />)
    },
  )
}
