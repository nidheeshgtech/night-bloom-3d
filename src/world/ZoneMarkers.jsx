import { Html } from '@react-three/drei'
import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { ZONES } from './plan'

// Numbered, clickable zone labels floating over each petal in aerial view. In site-map view
// they become compact numbered badges, keyed to the legend.
export default function ZoneMarkers() {
  const mode = useGarden((s) => s.mode)
  const focus = useGarden((s) => s.focus)
  const showOn = useGarden((s) => s.show !== null)
  const siteMap = useGarden((s) => s.siteMap)
  if (mode !== 'aerial' || showOn) return null
  return ZONES.map((z, i) => (
    <Html key={z.id} position={[z.center.x, z.center.y + z.pinHeight, z.center.z]} center zIndexRange={[10, 0]}>
      <button
        onWheel={(e) => document.querySelector('canvas')?.dispatchEvent(new WheelEvent('wheel', e.nativeEvent))}
        className={`zone-pin ${focus === z.id ? 'active' : ''} ${z.status} ${siteMap ? 'compact' : ''}`}
        style={{ '--zone': z.color }}
        onClick={() => rig.focusZone(z.id)}
      >
        <span className="zone-pin-num">{i + 1}</span>
        {!siteMap && (
          <span className="zone-pin-text">
            <span className="zone-pin-name">{z.name}</span>
            <span className="zone-pin-theme">{z.status === 'open' ? z.theme : `${z.theme} · opening soon`}</span>
          </span>
        )}
      </button>
    </Html>
  ))
}
