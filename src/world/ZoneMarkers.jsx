import { Html } from '@react-three/drei'
import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { ZONES } from './plan'

// Clickable zone labels floating over each petal in aerial view.
export default function ZoneMarkers() {
  const mode = useGarden((s) => s.mode)
  const focus = useGarden((s) => s.focus)
  if (mode !== 'aerial') return null
  return ZONES.map((z) => (
    <Html key={z.id} position={[z.center.x, z.center.y + z.pinHeight, z.center.z]} center zIndexRange={[10, 0]}>
      <button className={`zone-pin ${focus === z.id ? 'active' : ''} ${z.status}`} onClick={() => rig.focusZone(z.id)}>
        <span className="zone-pin-name">{z.name}</span>
        <span className="zone-pin-theme">{z.status === 'open' ? z.theme : `${z.theme} · opening soon`}</span>
      </button>
    </Html>
  ))
}
